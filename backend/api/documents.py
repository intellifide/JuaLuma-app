
import logging
import os
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User, UserDocument
from backend.utils import get_db

try:
    from PIL import Image, UnidentifiedImageError
except ImportError:  # pragma: no cover - dependency fallback
    Image = None  # type: ignore[assignment]
    UnidentifiedImageError = Exception  # type: ignore[misc]

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIC_DECODER_AVAILABLE = True
except ImportError:
    HEIC_DECODER_AVAILABLE = False

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# Basic local storage configuration
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_FILE_EXTENSIONS = {
    # Docs
    "pdf", "doc", "docx", "txt", "rtf", "md",
    # Sheets
    "csv", "xls", "xlsx",
    # Slides
    "ppt", "pptx",
    # Images
    "png", "jpg", "jpeg", "webp", "gif", "bmp", "heic",
    # Structured text
    "json", "xml",
}

ALLOWED_CONTENT_TYPE_PREFIXES = (
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
    "text/markdown",
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/",
    "application/json",
    "application/xml",
    "text/xml",
)

HEIC_EXTENSIONS = {"heic", "heif"}

HEIC_FAILURE_MESSAGES = {
    "HEIC_DECODER_UNAVAILABLE": (
        "HEIC upload is currently unavailable. Please convert the image to JPG or PNG and retry."
    ),
    "HEIC_EMPTY_FILE": "The HEIC file is empty. Please upload a valid image.",
    "HEIC_DECODE_FAILED": (
        "We couldn't process that HEIC image. Please export it as JPG or PNG and try again."
    ),
}


class HeicNormalizationError(Exception):
    def __init__(self, reason_code: str) -> None:
        super().__init__(reason_code)
        self.reason_code = reason_code


def _is_content_type_allowed(content_type: str | None) -> bool:
    if not content_type:
        return True
    normalized = content_type.lower().strip()
    return any(
        normalized == prefix or normalized.startswith(prefix)
        for prefix in ALLOWED_CONTENT_TYPE_PREFIXES
    )


def _extract_file_extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower().strip()


def _normalize_heic_bytes(file_bytes: bytes) -> bytes:
    if not file_bytes:
        raise HeicNormalizationError("HEIC_EMPTY_FILE")
    if not HEIC_DECODER_AVAILABLE or Image is None:
        raise HeicNormalizationError("HEIC_DECODER_UNAVAILABLE")

    try:
        with Image.open(BytesIO(file_bytes)) as source_image:
            rgb_image = source_image.convert("RGB")
            output = BytesIO()
            rgb_image.save(output, format="JPEG", quality=90, optimize=True)
            return output.getvalue()
    except (UnidentifiedImageError, OSError):
        raise HeicNormalizationError("HEIC_DECODE_FAILED") from None


@router.get("/")
@router.get("", include_in_schema=False)
def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all documents for the current user."""
    docs = db.query(UserDocument).filter(UserDocument.uid == current_user.uid).order_by(UserDocument.created_at.desc()).all()
    return [doc.to_dict() for doc in docs]


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    type: str = "uploaded",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a new document."""
    file_ext = _extract_file_extension(file.filename)
    if file_ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. Upload a supported document, sheet, slide, image, "
                "or structured text file."
            ),
        )

    if not _is_content_type_allowed(file.content_type):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file content type. Please upload a supported file format.",
        )

    stored_file_ext = file_ext

    try:
        raw_bytes = await file.read()
        if stored_file_ext in HEIC_EXTENSIONS:
            raw_bytes = _normalize_heic_bytes(raw_bytes)
            stored_file_ext = "jpg"
    except HeicNormalizationError as exc:
        logger.warning(
            "HEIC_NORMALIZATION_FAILED reason_code=%s filename=%s uid=%s",
            exc.reason_code,
            file.filename,
            current_user.uid,
        )
        raise HTTPException(
            status_code=400,
            detail=HEIC_FAILURE_MESSAGES.get(
                exc.reason_code,
                "We couldn't process that HEIC image. Please export it as JPG or PNG and try again.",
            ),
        ) from exc

    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Generate secure filename
    file_id = uuid.uuid4()
    secure_filename = f"{file_id}.{stored_file_ext}"
    file_path = UPLOAD_DIR / secure_filename

    try:
        with open(file_path, "wb") as buffer:
            buffer.write(raw_bytes)

        file_size = os.path.getsize(file_path)

        doc = UserDocument(
            id=file_id,
            uid=current_user.uid,
            name=file.filename,
            type=type,
            file_type=stored_file_ext,
            file_path=str(file_path),
            size_bytes=file_size
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        return doc.to_dict()

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="We encountered an issue uploading your file. Please try again.") from e


@router.get("/{doc_id}/download")
def download_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a specific document."""
    doc = db.query(UserDocument).filter(UserDocument.id == doc_id, UserDocument.uid == current_user.uid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="The requested document could not be found.")

    path = Path(doc.file_path)
    if not path.exists():
         raise HTTPException(status_code=404, detail="The file appears to be missing. Please contact support.")

    return FileResponse(path, filename=doc.name, media_type="application/octet-stream")

@router.get("/{doc_id}/preview")
def preview_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get preview URL or content for a document."""
    # For now, just re-use download logic but with inline disposition if possible,
    # or return file content for text.
    doc = db.query(UserDocument).filter(UserDocument.id == doc_id, UserDocument.uid == current_user.uid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    path = Path(doc.file_path)
    if not path.exists():
         raise HTTPException(status_code=404, detail="File not found on server")

    # Simple logic: if image or text, return it.
    media_type = "application/octet-stream"
    if doc.file_type in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic']:
        media_type = f"image/{doc.file_type}"
    elif doc.file_type == 'pdf':
        media_type = "application/pdf"
    elif doc.file_type in ['txt', 'csv', 'json']:
        media_type = "text/plain"

    return FileResponse(path, filename=doc.name, media_type=media_type)
