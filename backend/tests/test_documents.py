from io import BytesIO

from backend.models import UserDocument


def test_upload_document_accepts_supported_extension(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    response = test_client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", BytesIO(b"hello"), "text/plain")},
        data={"type": "uploaded"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "notes.txt"
    assert payload["fileType"] == "txt"
    assert payload["uid"] == mock_auth.uid


def test_upload_document_accepts_svg_extension(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    svg_payload = b"<svg xmlns='http://www.w3.org/2000/svg'><title>Upload</title></svg>"
    response = test_client.post(
        "/api/documents/upload",
        files={"file": ("diagram.svg", BytesIO(svg_payload), "image/svg+xml")},
        data={"type": "uploaded"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "diagram.svg"
    assert payload["fileType"] == "svg"


def test_upload_document_rejects_payload_too_large(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    monkeypatch.setattr("backend.api.documents.MAX_UPLOAD_BYTES", 8)
    tmp_path.mkdir(parents=True, exist_ok=True)

    response = test_client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", BytesIO(b"123456789"), "text/plain")},
        data={"type": "uploaded"},
    )

    assert response.status_code == 413
    assert "too large" in response.json()["detail"].lower()


def test_upload_document_rejects_unsupported_extension(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    response = test_client.post(
        "/api/documents/upload",
        files={
            "file": (
                "payload.exe",
                BytesIO(b"malicious"),
                "application/octet-stream",
            )
        },
        data={"type": "uploaded"},
    )

    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_document_rejects_disallowed_content_type(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    response = test_client.post(
        "/api/documents/upload",
        files={
            "file": (
                "notes.txt",
                BytesIO(b"hello"),
                "application/x-msdownload",
            )
        },
        data={"type": "uploaded"},
    )

    assert response.status_code == 400
    assert "Unsupported file content type" in response.json()["detail"]


def test_upload_document_normalizes_heic_to_jpg(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    monkeypatch.setattr(
        "backend.api.documents._normalize_heic_bytes",
        lambda _: b"normalized-jpeg-content",
    )
    tmp_path.mkdir(parents=True, exist_ok=True)

    response = test_client.post(
        "/api/documents/upload",
        files={"file": ("photo.heic", BytesIO(b"heic-bytes"), "image/heic")},
        data={"type": "uploaded"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["name"] == "photo.heic"
    assert payload["fileType"] == "jpg"

    stored_doc = test_db.query(UserDocument).filter(UserDocument.uid == mock_auth.uid).one()
    assert stored_doc.file_type == "jpg"


def test_upload_document_returns_explicit_heic_failure_reason_and_skips_persist(
    test_client, test_db, mock_auth, monkeypatch, tmp_path
):
    monkeypatch.setattr("backend.api.documents.UPLOAD_DIR", tmp_path)
    tmp_path.mkdir(parents=True, exist_ok=True)

    from backend.api.documents import HeicNormalizationError

    monkeypatch.setattr(
        "backend.api.documents._normalize_heic_bytes",
        lambda _: (_ for _ in ()).throw(HeicNormalizationError("HEIC_DECODE_FAILED")),
    )

    response = test_client.post(
        "/api/documents/upload",
        files={"file": ("photo.heic", BytesIO(b"bad-heic"), "image/heic")},
        data={"type": "uploaded"},
    )

    assert response.status_code == 400
    assert "couldn't process that HEIC image" in response.json()["detail"]
    assert test_db.query(UserDocument).filter(UserDocument.uid == mock_auth.uid).count() == 0
