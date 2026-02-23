import { describe, expect, it } from 'vitest'
import { FILE_ICON_LABELS, resolveFileIconKind } from '../../utils/fileIconMapping'

describe('file icon mapping taxonomy', () => {
  it('maps supported families to standardized taxonomy', () => {
    expect(resolveFileIconKind('pdf')).toBe('pdf')
    expect(resolveFileIconKind('jpg')).toBe('image')
    expect(resolveFileIconKind('docx')).toBe('word')
    expect(resolveFileIconKind('xlsx')).toBe('sheet')
    expect(resolveFileIconKind('pptx')).toBe('slide')
    expect(resolveFileIconKind('txt')).toBe('text')
  })

  it('falls back unknown file types to generic', () => {
    expect(resolveFileIconKind('unknown-ext')).toBe('generic')
    expect(FILE_ICON_LABELS[resolveFileIconKind('unknown-ext')]).toBe('FILE')
  })
})
