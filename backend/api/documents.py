
import logging
import os
import shutil
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.middleware.auth import get_current_user
from backend.models import User, UserDocument
from backend.utils import get_db

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# Basic local storage configuration
UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

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
    # Validate file type/size if necessary
    
    # Generate secure filename
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else "txt"
    file_id = uuid.uuid4()
    secure_filename = f"{file_id}.{file_ext}"
    file_path = UPLOAD_DIR / secure_filename
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_size = os.path.getsize(file_path)
        
        doc = UserDocument(
            id=file_id,
            uid=current_user.uid,
            name=file.filename,
            type=type,
            file_type=file_ext,
            file_path=str(file_path),
            size_bytes=file_size
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        
        return doc.to_dict()
        
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed")


@router.get("/{doc_id}/download")
def download_document(
    doc_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a specific document."""
    doc = db.query(UserDocument).filter(UserDocument.id == doc_id, UserDocument.uid == current_user.uid).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    path = Path(doc.file_path)
    if not path.exists():
         raise HTTPException(status_code=404, detail="File not found on server")
         
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
    if doc.file_type in ['jpg', 'jpeg', 'png', 'gif']:
        media_type = f"image/{doc.file_type}"
    elif doc.file_type == 'pdf':
        media_type = "application/pdf"
    elif doc.file_type in ['txt', 'csv', 'json']:
        media_type = "text/plain"
        
    return FileResponse(path, filename=doc.name, media_type=media_type)
