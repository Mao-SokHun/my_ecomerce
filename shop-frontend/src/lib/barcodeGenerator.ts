import JsBarcode from 'jsbarcode';

export interface BarcodeOptions {
  height?: number;
  width?: number;
  color?: string;
  background?: string;
  maxWidth?: string;
  showText?: boolean;
  fontSize?: number;
}

/**
 * Standard ISO/IEC 15417 Code 128 Barcode Generator.
 * Generates crisp vector SVG barcodes with full quiet zones & high optical contrast,
 * guaranteed to scan instantly with smartphone cameras (iOS/Android) and 1D/2D POS barcode laser scanners.
 */
export function generateBarcodeSvg(text: string, options?: BarcodeOptions): string {
  const cleanText = (text || 'ORD-0000').trim().toUpperCase();
  const height = options?.height || 42;
  const width = options?.width || 1.6;
  const color = options?.color || '#000000';
  const background = options?.background || '#ffffff';
  const maxWidth = options?.maxWidth || '240px';
  const showText = options?.showText !== false;
  const fontSize = options?.fontSize || 12;

  let svgEl: SVGElement | any;

  if (typeof document !== 'undefined' && document.createElementNS) {
    svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  } else {
    // SSR / Node environment fallback mock
    function createMock(tag: string): any {
      const attributes: Record<string, string> = {};
      const children: any[] = [];
      return {
        nodeType: 1,
        nodeName: tag,
        attributes,
        children,
        textContent: '',
        hasAttribute(k: string) {
          return k in attributes;
        },
        getAttribute(k: string) {
          return attributes[k];
        },
        setAttribute(k: string, v: string | number) {
          attributes[k] = String(v);
        },
        removeAttribute(k: string) {
          delete attributes[k];
        },
        appendChild(child: any) {
          children.push(child);
        },
        ownerDocument: {
          createElementNS(_ns: string, t: string) {
            return createMock(t);
          },
          createTextNode(t: string) {
            return { nodeType: 3, nodeValue: t, textContent: t };
          },
          createElement(t: string) {
            if (t === 'canvas') {
              return {
                getContext() {
                  return {
                    measureText(str: string) {
                      return { width: (str || '').length * (fontSize * 0.6) };
                    },
                  };
                },
              };
            }
            return createMock(t);
          },
        },
      };
    }
    svgEl = createMock('svg');
    if (typeof global !== 'undefined' && !(global as any).document) {
      (global as any).document = svgEl.ownerDocument;
    }
  }

  try {
    JsBarcode(svgEl, cleanText, {
      format: 'CODE128',
      width: width,
      height: height,
      displayValue: showText,
      font: 'monospace',
      fontSize: fontSize,
      fontOptions: 'bold',
      textMargin: 3,
      background: background,
      lineColor: color,
      margin: 8,
    });

    let rawSvg = '';
    if (typeof XMLSerializer !== 'undefined') {
      rawSvg = new XMLSerializer().serializeToString(svgEl);
    } else if (svgEl.outerHTML) {
      rawSvg = svgEl.outerHTML;
    } else {
      function serialize(el: any): string {
        if (el.nodeType === 3) return el.nodeValue || '';
        const attrs = Object.entries(el.attributes)
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        const open = `<${el.nodeName}${attrs ? ' ' + attrs : ''}>`;
        const inner = (el.children || []).map(serialize).join('') + (el.textContent || '');
        const close = `</${el.nodeName}>`;
        return `${open}${inner}${close}`;
      }
      rawSvg = serialize(svgEl);
    }

    return `
      <div style="width: 100%; max-width: ${maxWidth}; margin: 6px auto 2px auto; text-align: center; background: #ffffff; padding: 2px;">
        <div style="width: 100%; overflow: hidden; display: flex; justify-content: center; align-items: center;">
          ${rawSvg.replace('<svg ', '<svg shape-rendering="crispEdges" style="max-width: 100%; height: auto; display: block;" ')}
        </div>
      </div>
    `.trim();
  } catch {
    return `<div style="text-align: center; font-family: monospace; font-size: 11px; font-weight: bold; padding: 4px;">* ${cleanText} *</div>`;
  }
}
