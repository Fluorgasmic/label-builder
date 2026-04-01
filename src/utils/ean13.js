const EAN_L = ["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];
const EAN_G = ["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];
const EAN_R = ["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];
const EAN_PARITY = ["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"];

export function eanCheckDigit(d12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (s % 10)) % 10;
}

export function eanToBars(ean) {
  let d = ean.replace(/\D/g, "");
  if (d.length < 12) return null;
  if (d.length === 12) d += eanCheckDigit(d);
  if (d.length !== 13) return null;
  const dg = d.split("").map(Number);
  const par = EAN_PARITY[dg[0]];
  let bars = "101";
  for (let i = 0; i < 6; i++) bars += (par[i] === "L" ? EAN_L : EAN_G)[dg[i + 1]];
  bars += "01010";
  for (let i = 0; i < 6; i++) bars += EAN_R[dg[i + 7]];
  bars += "101";
  return { bars, digits: d };
}

export function generateEAN13SVG(ean, width, height) {
  const result = eanToBars(ean);
  if (!result) return null;
  const { bars, digits } = result;
  const qz = 7;
  const tw = bars.length + qz * 2;
  const mW = width / tw;
  const tH = height * 0.20;
  const bH = height - tH;
  const gE = tH * 0.45;
  const oX = qz * mW;

  let rects = '';
  for (let i = 0; i < bars.length; i++) {
    if (bars[i] === "1") {
      const isG = (i < 3) || (i >= 45 && i <= 49) || (i >= bars.length - 3);
      rects += `<rect x="${oX + i * mW}" y="0" width="${mW + 0.3}" height="${isG ? bH + gE : bH}" fill="black"/>`;
    }
  }

  const fs = Math.max(8, Math.min(12, width * 0.10));
  const ty = height - 0.5;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="display:block;">
    ${rects}
    <text x="${oX - mW * 2}" y="${ty}" font-family="'JetBrains Mono',monospace" font-size="${fs}" fill="black" text-anchor="middle">${digits[0]}</text>
    <text x="${oX + 3 * mW + 21 * mW}" y="${ty}" font-family="'JetBrains Mono',monospace" font-size="${fs}" fill="black" text-anchor="middle" letter-spacing="${mW * 2}px">${digits.substring(1, 7)}</text>
    <text x="${oX + 50 * mW + 21 * mW}" y="${ty}" font-family="'JetBrains Mono',monospace" font-size="${fs}" fill="black" text-anchor="middle" letter-spacing="${mW * 2}px">${digits.substring(7)}</text>
  </svg>`;
}
