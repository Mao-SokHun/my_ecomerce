/**
 * Code 128 (Subset B) SVG Barcode Generator
 * Generates crisp vector SVG barcodes that never wrap and scale perfectly on thermal receipts & PDF exports.
 */

const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106
];

export function generateBarcodeSvg(
  text: string,
  options?: { height?: number; color?: string; maxWidth?: string; showText?: boolean }
): string {
  const cleanText = (text || 'ORD-0000').toUpperCase().replace(/[^ -~]/g, '');
  const height = options?.height || 38;
  const color = options?.color || '#0f172a';
  const maxWidth = options?.maxWidth || '210px';
  const showText = options?.showText !== false;

  const START_B = 104;
  const STOP = 106;
  const codes = [START_B];
  let checksum = START_B;

  for (let i = 0; i < cleanText.length; i++) {
    const code = cleanText.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  codes.push(checksum % 103);
  codes.push(STOP);

  let patternStr = '';
  for (const code of codes) {
    patternStr += CODE128_PATTERNS[code] || '';
  }

  let totalWidth = 0;
  for (const c of patternStr) {
    totalWidth += parseInt(c, 10);
  }

  // Add 10-module quiet zones on both sides
  const quietZone = 10;
  const fullWidth = totalWidth + quietZone * 2;

  let x = quietZone;
  let isBar = true;
  const rects: string[] = [];

  for (const c of patternStr) {
    const w = parseInt(c, 10);
    if (isBar) {
      rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="${color}" />`);
    }
    x += w;
    isBar = !isBar;
  }

  const svgElement = `
    <div style="width: 100%; max-width: ${maxWidth}; margin: 8px auto 3px auto; text-align: center;">
      <svg viewBox="0 0 ${fullWidth} ${height}" width="100%" height="${height}" preserveAspectRatio="none" style="display: block; width: 100%; height: ${height}px;">
        ${rects.join('')}
      </svg>
      ${
        showText
          ? `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 9.5px; font-weight: 700; color: #475569; letter-spacing: 1.5px; margin-top: 3px; text-transform: uppercase;">* ${cleanText} *</div>`
          : ''
      }
    </div>
  `.trim();

  return svgElement;
}
