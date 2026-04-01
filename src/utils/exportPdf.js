import { jsPDF } from 'jspdf';
import { eanToBars } from './ean13';

let fontsRegistered = false;
const fontCache = {};

async function loadFontB64(name) {
  if (fontCache[name]) return fontCache[name];
  const mod = await import(`../assets/fonts/${name}.b64?raw`);
  fontCache[name] = mod.default;
  return mod.default;
}

async function registerFonts(doc, customFonts = []) {
  if (!doc.__fontsLoaded) {
    const [regular, medium, bold, heavy] = await Promise.all([
      loadFontB64('regular'),
      loadFontB64('medium'),
      loadFontB64('bold'),
      loadFontB64('heavy'),
    ]);

    doc.addFileToVFS('TStarPro-Regular.ttf', regular);
    doc.addFont('TStarPro-Regular.ttf', 'TStarPro', 'normal');
    doc.addFileToVFS('TStarPro-Medium.ttf', medium);
    doc.addFont('TStarPro-Medium.ttf', 'TStarPro-Medium', 'normal');
    doc.addFileToVFS('TStarPro-Bold.ttf', bold);
    doc.addFont('TStarPro-Bold.ttf', 'TStarPro-Bold', 'normal');
    doc.addFileToVFS('TStarPro-Heavy.ttf', heavy);
    doc.addFont('TStarPro-Heavy.ttf', 'TStarPro-Heavy', 'normal');

    // Register custom fonts
    for (const cf of customFonts) {
      const filename = `${cf.name}.ttf`;
      doc.addFileToVFS(filename, cf.b64);
      doc.addFont(filename, cf.name, 'normal');
    }

    doc.__fontsLoaded = true;
  }
}

function mm2pt(mm) {
  return mm * 2.8346;
}

function getFontName(fontFamily, fontWeight, customFonts = []) {
  if (fontFamily === 'T-Star Pro') {
    if (fontWeight >= 900) return ['TStarPro-Heavy', 'normal'];
    if (fontWeight >= 700) return ['TStarPro-Bold', 'normal'];
    if (fontWeight >= 500) return ['TStarPro-Medium', 'normal'];
    return ['TStarPro', 'normal'];
  }
  if (fontFamily === 'JetBrains Mono' || fontFamily === 'Courier') {
    return ['courier', 'normal'];
  }
  // Check custom fonts
  if (customFonts.some((f) => f.name === fontFamily)) {
    return [fontFamily, 'normal'];
  }
  return ['helvetica', fontWeight >= 700 ? 'bold' : 'normal'];
}

function drawEAN13(doc, ean, x, y, width, height) {
  const result = eanToBars(ean);
  if (!result) return;
  const { bars, digits } = result;
  const qz = 7;
  const tw = bars.length + qz * 2;
  const mW = width / tw;
  const tH = height * 0.20;
  const bH = height - tH;
  const gE = tH * 0.45;
  const oX = x + qz * mW;

  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, 'F');
  doc.setFillColor(0, 0, 0);

  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === '1') {
      const isG = (i < 3) || (i >= 45 && i <= 49) || (i >= bars.length - 3);
      doc.rect(oX + i * mW, y, mW + 0.05, isG ? bH + gE : bH, 'F');
    }
  }

  const fs = Math.max(5, Math.min(7, width * 0.065));
  const ty = y + height - 0.3;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fs);
  doc.setFont('courier', 'normal');
  doc.text(digits[0], oX - mW * 1, ty, { align: 'right' });
  doc.text(digits.substring(1, 7), oX + 3 * mW + 21 * mW, ty, { align: 'center', charSpace: mW * 0.8 });
  doc.text(digits.substring(7), oX + 50 * mW + 21 * mW, ty, { align: 'center', charSpace: mW * 0.8 });
}

function drawCropMarks(doc, x, y, w, h) {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  const len = 3, off = 1;
  doc.line(x - off - len, y, x - off, y);
  doc.line(x, y - off - len, x, y - off);
  doc.line(x + w + off, y, x + w + off + len, y);
  doc.line(x + w, y - off - len, x + w, y - off);
  doc.line(x - off - len, y + h, x - off, y + h);
  doc.line(x, y + h + off, x, y + h + off + len);
  doc.line(x + w + off, y + h, x + w + off + len, y + h);
  doc.line(x + w, y + h + off, x + w, y + h + off + len);
}

function drawLabelToPDF(doc, blocks, record, ox, oy, customFonts = []) {
  for (const block of blocks) {
    const bx = ox + block.x;
    const by = oy + block.y;

    if (block.type === 'text') {
      let text = '';
      if (block.dataColumn && record && record[block.dataColumn]) {
        text = record[block.dataColumn].toString().trim();
      } else if (!block.dataColumn) {
        text = block.text || '';
      }
      if (!text) continue;

      const [fontName, fontStyle] = getFontName(block.fontFamily, block.fontWeight, customFonts);
      doc.setFont(fontName, fontStyle);
      doc.setFontSize(mm2pt(block.fontSize));

      const hex = block.color || '#000000';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      doc.setTextColor(r, g, b);

      // Vertical alignment
      const va = block.verticalAlign || 'top';
      const textHeightMM = block.fontSize * 0.85;
      let textY;
      if (va === 'middle') {
        textY = by + (block.height + textHeightMM) / 2;
      } else if (va === 'bottom') {
        textY = by + block.height - (block.fontSize * 0.15);
      } else {
        textY = by + textHeightMM;
      }

      let textX = bx;
      let align = 'left';
      if (block.align === 'center') {
        textX = bx + block.width / 2;
        align = 'center';
      } else if (block.align === 'right') {
        textX = bx + block.width;
        align = 'right';
      }

      doc.text(text, textX, textY, { align, maxWidth: block.width });
    }

    if (block.type === 'image' && block.src) {
      try {
        const isJpeg = block.src.includes('image/jpeg');
        const format = isJpeg ? 'JPEG' : 'PNG';
        // Get natural dimensions to preserve aspect ratio
        const imgProps = doc.getImageProperties(block.src);
        const imgRatio = imgProps.width / imgProps.height;
        const boxRatio = block.width / block.height;
        let drawW, drawH, drawX, drawY;
        if (imgRatio > boxRatio) {
          // Image is wider than box — fit to width
          drawW = block.width;
          drawH = block.width / imgRatio;
          drawX = bx;
          drawY = by + (block.height - drawH) / 2;
        } else {
          // Image is taller than box — fit to height
          drawH = block.height;
          drawW = block.height * imgRatio;
          drawX = bx + (block.width - drawW) / 2;
          drawY = by;
        }
        doc.addImage(block.src, format, drawX, drawY, drawW, drawH);
      } catch (e) {
        console.error('Image error:', e);
      }
    }

    if (block.type === 'line') {
      const hex = block.color || '#000000';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      doc.setFillColor(r, g, b);
      doc.rect(bx, by, block.width, block.height, 'F');
    }

    if (block.type === 'barcode') {
      let val = '';
      if (block.dataColumn && record && record[block.dataColumn]) {
        val = record[block.dataColumn].toString().trim();
      } else if (!block.dataColumn) {
        val = block.staticValue || '';
      }
      if (val) {
        drawEAN13(doc, val, bx, by, block.width, block.height);
      }
    }
  }
}

export async function exportPDF({ blocks, records, label, options, customFonts = [] }) {
  const { format = 'single', showCropMarks = true, a4MarginTop = 10, a4MarginBottom = 10, a4MarginLeft = 10, a4MarginRight = 10, a4Gutter = 4 } = options;
  const ww = label.width;
  const hh = label.height;

  if (format === 'single') {
    const mg = showCropMarks ? 5 : 0;
    const pW = ww + mg * 2;
    const pH = hh + mg * 2;
    const doc = new jsPDF({
      orientation: pW > pH ? 'l' : 'p',
      unit: 'mm',
      format: [pW, pH],
    });
    await registerFonts(doc, customFonts);

    for (let i = 0; i < records.length; i++) {
      if (i > 0) doc.addPage([pW, pH]);
      if (showCropMarks) drawCropMarks(doc, mg, mg, ww, hh);
      drawLabelToPDF(doc, blocks, records[i], mg, mg, customFonts);
    }

    doc.save('etiquettes_batch.pdf');
  } else {
    const usableW = 210 - a4MarginLeft - a4MarginRight;
    const usableH = 297 - a4MarginTop - a4MarginBottom;
    const cols = Math.floor((usableW + a4Gutter) / (ww + a4Gutter));
    const rows = Math.floor((usableH + a4Gutter) / (hh + a4Gutter));
    const gridW = cols * ww + (cols - 1) * a4Gutter;
    const gridH = rows * hh + (rows - 1) * a4Gutter;
    const sx = a4MarginLeft + (usableW - gridW) / 2;
    const sy = a4MarginTop + (usableH - gridH) / 2;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    await registerFonts(doc, customFonts);

    let idx = 0;
    const totalPages = Math.ceil(records.length / (cols * rows));

    for (let p = 0; p < totalPages; p++) {
      if (p > 0) doc.addPage('a4', 'p');
      for (let r = 0; r < rows && idx < records.length; r++) {
        for (let c = 0; c < cols && idx < records.length; c++) {
          const x = sx + c * (ww + a4Gutter);
          const y = sy + r * (hh + a4Gutter);
          if (showCropMarks) drawCropMarks(doc, x, y, ww, hh);
          drawLabelToPDF(doc, blocks, records[idx], x, y, customFonts);
          idx++;
        }
      }
    }

    doc.save('etiquettes_A4_imposition.pdf');
  }
}
