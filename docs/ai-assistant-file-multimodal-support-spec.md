# AI Assistant File And Multimodal Support Spec

## Supported File Allowlist

- Docs: `pdf`, `doc`, `docx`, `txt`, `rtf`, `md`
- Sheets: `csv`, `xls`, `xlsx`
- Slides: `ppt`, `pptx`
- Images: `png`, `jpg`, `jpeg`, `webp`, `gif`, `bmp`, `heic`
- Structured text: `json`, `xml`

## Unsupported File Policy

- Unsupported files are blocked before submit where platform APIs allow type filtering.
- Server must reject unsupported file uploads when client-side checks are bypassed.
- Required user-safe reject copy:
  - `This file type is not supported. Upload a supported document, spreadsheet, slide, image, JSON, or XML file.`

## HEIC Decode And Failure Handling

- HEIC files must be decoded and normalized before multimodal parsing.
- On decode/normalize failure:
  - exclude failed HEIC from context injection
  - return explicit user-readable error message
  - emit reason-coded failure logs for diagnostics

## Composer Attachment Requirements

- Render file chips above the composer text box.
- Render a separator line between attachment chips and text input.
- Chip content format:
  - standardized file-type icon
  - filename truncated to first ~10 visible characters
  - remove action per chip
- Attachment display order: chronological within session.

## Storage Icon Requirements

- Storage listing icon taxonomy:
  - `pdf`, `image`, `word`, `sheet`, `slide`, `text`, `generic`
- Unknown or edge types must map to `generic`.
- Composer and storage surfaces must use the same icon taxonomy.
