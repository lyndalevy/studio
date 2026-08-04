/**
 * Minimal intrinsic-dimension reader for JPEG / PNG / WebP / GIF.
 *
 * Only reads the file header, not the whole image, so it's cheap enough to
 * run over a whole folder at build time. Used so the photo grid can lay out
 * mixed portrait/landscape shots without any layout shift.
 */

import { open } from "node:fs/promises";

export type Dimensions = { width: number; height: number };

const HEADER_BYTES = 64 * 1024;

async function readHead(filePath: string): Promise<Buffer> {
  const fh = await open(filePath, "r");
  try {
    const buf = Buffer.alloc(HEADER_BYTES);
    const { bytesRead } = await fh.read(buf, 0, HEADER_BYTES, 0);
    return buf.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
}

function pngSize(b: Buffer): Dimensions | null {
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): Dimensions | null {
  if (b.length < 10 || b.subarray(0, 3).toString("latin1") !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function webpSize(b: Buffer): Dimensions | null {
  if (b.length < 30) return null;
  if (b.subarray(0, 4).toString("latin1") !== "RIFF") return null;
  if (b.subarray(8, 12).toString("latin1") !== "WEBP") return null;
  const fourcc = b.subarray(12, 16).toString("latin1");
  if (fourcc === "VP8 ") {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === "VP8L") {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === "VP8X") {
    const w = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const h = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { width: w, height: h };
  }
  return null;
}

function jpegSize(b: Buffer): Dimensions | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = b[i + 1];
    // Standalone markers carry no length payload.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = b.readUInt16BE(i + 2);
    // SOF0..SOF15, excluding DHT(c4), JPGA(c8), DAC(cc)
    const isSOF =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
    }
    i += 2 + len;
  }
  return null;
}

/** Returns intrinsic dimensions, or null if the format isn't recognised. */
export async function imageSize(filePath: string): Promise<Dimensions | null> {
  try {
    const b = await readHead(filePath);
    return pngSize(b) ?? jpegSize(b) ?? webpSize(b) ?? gifSize(b);
  } catch {
    return null;
  }
}
