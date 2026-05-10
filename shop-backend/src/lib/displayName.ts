/** Letters from any script + spaces, hyphen, apostrophe, period. Hyphen first avoids range parsing in `[]`. */
export const DISPLAY_NAME_PATTERN = /^[-\p{L}\p{M}\s'.]+$/u;

const INVISIBLE_FORMAT_CHARS = /[\u200B-\u200D\uFEFF\u2060]/g;

/** NFC, strip ZWSP/ZWNJ/ZWJ/BOM/word-joiner, trim, collapse spaces (IME/copy-paste safe). */
export function normalizeDisplayName(raw: string): string {
  return String(raw)
    .normalize('NFC')
    .replace(INVISIBLE_FORMAT_CHARS, '')
    .trim()
    .replace(/\s+/g, ' ');
}
