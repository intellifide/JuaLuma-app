export type FileIconKind =
  | 'pdf'
  | 'image'
  | 'word'
  | 'sheet'
  | 'slide'
  | 'text'
  | 'generic'

const FILE_ICON_KIND_BY_EXTENSION: Record<string, FileIconKind> = {
  pdf: 'pdf',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  bmp: 'image',
  heic: 'image',
  svg: 'image',
  doc: 'word',
  docx: 'word',
  csv: 'sheet',
  xls: 'sheet',
  xlsx: 'sheet',
  ppt: 'slide',
  pptx: 'slide',
  txt: 'text',
  rtf: 'text',
  md: 'text',
  json: 'text',
  xml: 'text',
}

export const FILE_ICON_LABELS: Record<FileIconKind, string> = {
  pdf: 'PDF',
  image: 'IMG',
  word: 'DOC',
  sheet: 'XLS',
  slide: 'PPT',
  text: 'TXT',
  generic: 'FILE',
}

export const resolveFileIconKind = (fileType: string): FileIconKind =>
  FILE_ICON_KIND_BY_EXTENSION[fileType.toLowerCase()] ?? 'generic'
