from pathlib import Path

import pytest

from backend.models import UserDocument
from backend.services.financial_context import (
    _uploaded_documents_context,
    get_financial_context,
)


def _create_user_document(
    *,
    test_db,
    uid: str,
    name: str,
    file_type: str,
    file_path: Path,
    size_bytes: int = 0,
) -> UserDocument:
    doc = UserDocument(
        uid=uid,
        name=name,
        type="uploaded",
        file_type=file_type,
        file_path=str(file_path),
        size_bytes=size_bytes,
    )
    test_db.add(doc)
    test_db.commit()
    test_db.refresh(doc)
    return doc


@pytest.mark.asyncio
async def test_get_financial_context_includes_uploaded_file_context_and_audit_logs(
    test_db, mock_auth, tmp_path, monkeypatch, caplog
):
    upload_path = tmp_path / "notes.txt"
    upload_path.write_text("Budget variance is down and spending is stable.", encoding="utf-8")
    _create_user_document(
        test_db=test_db,
        uid=mock_auth.uid,
        name="notes.txt",
        file_type="txt",
        file_path=upload_path,
        size_bytes=upload_path.stat().st_size,
    )

    monkeypatch.setattr("backend.services.financial_context.set_db_user_context", lambda *_: None)
    monkeypatch.setattr("backend.services.financial_context._vector_search", lambda *_, **__: [])
    monkeypatch.setattr("backend.services.financial_context._spending_summary", lambda *_, **__: [])
    monkeypatch.setattr(
        "backend.services.financial_context._account_summary",
        lambda *_, **__: {
            "net_worth": 2500.0,
            "connected_accounts": 1,
            "manual_assets": 0,
            "accounts_by_type": {"checking": 1},
        },
    )
    monkeypatch.setattr(
        "backend.services.financial_context._support_summary",
        lambda *_, **__: {"open_count": 0, "recent_subjects": []},
    )
    monkeypatch.setattr(
        "backend.services.financial_context._subscription_summary",
        lambda *_, **__: {"plan": "free", "status": "active"},
    )

    caplog.set_level("INFO")
    context = await get_financial_context(mock_auth.uid, "Summarize my latest uploads.", db=test_db)

    assert "## Account Overview" in context
    assert "## Uploaded File Context" in context
    assert "notes.txt (txt): Budget variance is down and spending is stable." in context
    assert "AI_UPLOAD_CONTEXT_ASSEMBLY" in caplog.text


def test_uploaded_documents_context_skips_missing_files_with_reason(
    test_db, mock_auth, tmp_path
):
    missing_path = tmp_path / "missing.txt"
    _create_user_document(
        test_db=test_db,
        uid=mock_auth.uid,
        name="missing.txt",
        file_type="txt",
        file_path=missing_path,
        size_bytes=0,
    )

    section, audit = _uploaded_documents_context(test_db, mock_auth.uid)
    assert section == ""
    assert audit["considered"] == 1
    assert audit["included"] == 0
    assert audit["skip_reasons"]["DOC_FILE_MISSING"] == 1


def test_uploaded_documents_context_skips_unparsable_file_types(test_db, mock_auth, tmp_path):
    pdf_path = tmp_path / "statement.pdf"
    pdf_path.write_bytes(b"%PDF-1.4")
    _create_user_document(
        test_db=test_db,
        uid=mock_auth.uid,
        name="statement.pdf",
        file_type="pdf",
        file_path=pdf_path,
        size_bytes=pdf_path.stat().st_size,
    )

    section, audit = _uploaded_documents_context(test_db, mock_auth.uid)
    assert "## Uploaded File Context" in section
    assert "statement.pdf (pdf): Uploaded file metadata only." in section
    assert audit["considered"] == 1
    assert audit["included"] == 1
    assert audit["skip_reasons"] == {}


def test_uploaded_documents_context_respects_attachment_ids_filter(test_db, mock_auth, tmp_path):
    notes_path = tmp_path / "notes.txt"
    notes_path.write_text("First file included.", encoding="utf-8")
    doc_a = _create_user_document(
        test_db=test_db,
        uid=mock_auth.uid,
        name="notes.txt",
        file_type="txt",
        file_path=notes_path,
        size_bytes=notes_path.stat().st_size,
    )

    other_path = tmp_path / "other.txt"
    other_path.write_text("Second file should be excluded.", encoding="utf-8")
    _create_user_document(
        test_db=test_db,
        uid=mock_auth.uid,
        name="other.txt",
        file_type="txt",
        file_path=other_path,
        size_bytes=other_path.stat().st_size,
    )

    section, audit = _uploaded_documents_context(
        test_db,
        mock_auth.uid,
        attachment_ids=[str(doc_a.id)],
    )

    assert "notes.txt (txt): First file included." in section
    assert "other.txt (txt)" not in section
    assert audit["considered"] == 1
    assert audit["included"] == 1
