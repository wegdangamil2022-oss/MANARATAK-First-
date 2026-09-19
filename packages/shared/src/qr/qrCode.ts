/**
 * Minimal standards-compliant QR Code Model 2 encoder for MANARATAK verification URLs.
 *
 * Scope is intentionally narrow: Version 4, error-correction level L, byte mode,
 * UTF-8 payloads up to 106 bytes. That safely covers the canonical public
 * certificate verification URL while avoiding a runtime dependency on a third-party
 * QR service or browser network request. The generated matrix is a real QR code,
 * suitable for screen, SVG, PDF and print rendering.
 */

export type QrMatrix = readonly (readonly boolean[])[];

const VERSION = 4;
const SIZE = 17 + VERSION * 4; // 37
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const MAX_BYTE_PAYLOAD = 78;
const FORMAT_ECL_L_BITS = 1; // QR format bits: L = 01
const MASK = 0;

export function createQrMatrix(value: string): QrMatrix {
  const payload = new TextEncoder().encode(value);
  if (payload.length === 0) throw new Error('QR_PAYLOAD_REQUIRED');
  if (payload.length > MAX_BYTE_PAYLOAD) {
    throw new Error(`QR_PAYLOAD_TOO_LONG:${payload.length}>${MAX_BYTE_PAYLOAD}`);
  }

  const codewords = [...createDataCodewords(payload), ...reedSolomonRemainder(createDataCodewords(payload), ECC_CODEWORDS)];
  const modules: (boolean | null)[][] = Array.from({ length: SIZE }, () => Array<boolean | null>(SIZE).fill(null));
  const functionModules: boolean[][] = Array.from({ length: SIZE }, () => Array<boolean>(SIZE).fill(false));

  const setFunction = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
    modules[y][x] = dark;
    functionModules[y][x] = true;
  };

  drawFinder(modules, functionModules, 0, 0);
  drawFinder(modules, functionModules, SIZE - 7, 0);
  drawFinder(modules, functionModules, 0, SIZE - 7);
  drawAlignment(modules, functionModules, 26, 26);

  for (let i = 8; i < SIZE - 8; i += 1) {
    if (!functionModules[6][i]) setFunction(i, 6, i % 2 === 0);
    if (!functionModules[i][6]) setFunction(6, i, i % 2 === 0);
  }

  // Reserve format information areas using a valid provisional value.
  drawFormatBits(modules, functionModules, MASK);
  setFunction(8, SIZE - 8, true); // fixed dark module

  let bitIndex = 0;
  let upward = true;
  for (let right = SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // timing column
    for (let vertical = 0; vertical < SIZE; vertical += 1) {
      const y = upward ? SIZE - 1 - vertical : vertical;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (functionModules[y][x]) continue;
        let dark = false;
        if (bitIndex < codewords.length * 8) {
          dark = ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) !== 0;
          bitIndex += 1;
        }
        if (maskBit(MASK, x, y)) dark = !dark;
        modules[y][x] = dark;
      }
    }
    upward = !upward;
  }

  drawFormatBits(modules, functionModules, MASK);
  return modules.map((row) => row.map(Boolean));
}

export function qrMatrixToSvg(matrix: QrMatrix, options: { moduleSize?: number; quietZone?: number; foreground?: string; background?: string } = {}): string {
  const moduleSize = options.moduleSize ?? 8;
  const quietZone = options.quietZone ?? 4;
  const foreground = options.foreground ?? '#142B5F';
  const background = options.background ?? '#FFFFFF';
  const size = matrix.length;
  const dimension = (size + quietZone * 2) * moduleSize;
  const rects: string[] = [];
  matrix.forEach((row, y) => row.forEach((dark, x) => {
    if (dark) rects.push(`<rect x="${(x + quietZone) * moduleSize}" y="${(y + quietZone) * moduleSize}" width="${moduleSize}" height="${moduleSize}"/>`);
  }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dimension} ${dimension}" width="${dimension}" height="${dimension}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="${escapeXml(background)}"/><g fill="${escapeXml(foreground)}">${rects.join('')}</g></svg>`;
}

function createDataCodewords(payload: Uint8Array): number[] {
  const bits: number[] = [];
  appendBits(bits, 0b0100, 4); // Byte mode
  appendBits(bits, payload.length, 8); // Versions 1-9 use 8-bit byte count
  for (const value of payload) appendBits(bits, value, 8);
  const capacity = DATA_CODEWORDS * 8;
  appendBits(bits, 0, Math.min(4, capacity - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let value = 0;
    for (let j = 0; j < 8; j += 1) value = (value << 1) | bits[i + j];
    data.push(value);
  }
  let pad = 0;
  while (data.length < DATA_CODEWORDS) {
    data.push(pad % 2 === 0 ? 0xec : 0x11);
    pad += 1;
  }
  return data;
}

function appendBits(target: number[], value: number, length: number): void {
  for (let i = length - 1; i >= 0; i -= 1) target.push((value >>> i) & 1);
}

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(function initializeGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
})();

function gfMultiply(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function reedSolomonGenerator(degree: number): number[] {
  let polynomial = [1];
  for (let i = 0; i < degree; i += 1) {
    const root = GF_EXP[i];
    const next = new Array(polynomial.length + 1).fill(0);
    for (let j = 0; j < polynomial.length; j += 1) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= gfMultiply(polynomial[j], root);
    }
    polynomial = next;
  }
  return polynomial;
}

function reedSolomonRemainder(data: number[], degree: number): number[] {
  const divisor = reedSolomonGenerator(degree);
  const remainder = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) remainder[i] ^= gfMultiply(divisor[i + 1], factor);
  }
  return remainder;
}

function drawFinder(modules: (boolean | null)[][], functions: boolean[][], left: number, top: number): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const x = left + dx;
      const y = top + dy;
      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
      const inPattern = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      const dark = inPattern && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      modules[y][x] = dark;
      functions[y][x] = true;
    }
  }
}

function drawAlignment(modules: (boolean | null)[][], functions: boolean[][], centerX: number, centerY: number): void {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const distance = Math.max(Math.abs(dx), Math.abs(dy));
      modules[centerY + dy][centerX + dx] = distance !== 1;
      functions[centerY + dy][centerX + dx] = true;
    }
  }
}

function drawFormatBits(modules: (boolean | null)[][], functions: boolean[][], mask: number): void {
  const data = (FORMAT_ECL_L_BITS << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) remainder = (remainder << 1) ^ (((remainder >>> 9) & 1) ? 0x537 : 0);
  const bits = ((data << 10) | remainder) ^ 0x5412;
  const bit = (index: number) => ((bits >>> index) & 1) !== 0;
  const set = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    functions[y][x] = true;
  };

  for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
  set(8, 7, bit(6));
  set(8, 8, bit(7));
  set(7, 8, bit(8));
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));

  for (let i = 0; i < 8; i += 1) set(SIZE - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i += 1) set(8, SIZE - 15 + i, bit(i));
  set(8, SIZE - 8, true);
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return ((((x * y) % 2) + ((x * y) % 3)) % 2) === 0;
    case 7: return ((((x + y) % 2) + ((x * y) % 3)) % 2) === 0;
    default: throw new Error(`QR_MASK_UNSUPPORTED:${mask}`);
  }
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char] ?? char);
}
