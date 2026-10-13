/** Inspect encoded dimensions before PDF/image libraries allocate decoded pixels. */
export function assertCertificateVisualImage(
  bytes: Uint8Array,
  mimeType: string,
): void {
  const data = Buffer.from(bytes);
  let width = 0,
    height = 0;
  if (data.length === 0 || data.length > 2 * 1024 * 1024)
    throw new Error('CERTIFICATE_VISUAL_ASSET_TOO_LARGE');
  if (mimeType === 'image/png') {
    if (
      data.length < 33 ||
      !data
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      data.readUInt32BE(8) !== 13 ||
      data.toString('ascii', 12, 16) !== 'IHDR'
    )
      throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
    width = data.readUInt32BE(16);
    height = data.readUInt32BE(20);
  } else if (mimeType === 'image/jpeg') {
    if (data.length < 4 || data[0] !== 255 || data[1] !== 216)
      throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
    let offset = 2;
    while (offset < data.length) {
      if (data[offset++] !== 255)
        throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
      while (data[offset] === 255) offset++;
      const marker = data[offset++];
      if (
        marker === undefined ||
        marker === 0 ||
        marker === 217 ||
        marker === 218
      )
        break;
      if (marker === 216 || marker === 1 || (marker >= 208 && marker <= 215))
        continue;
      if (offset + 2 > data.length)
        throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
      const length = data.readUInt16BE(offset);
      if (length < 2 || offset + length > data.length)
        throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
      if ([192, 193, 194].includes(marker)) {
        if (length < 8)
          throw new Error('CERTIFICATE_VISUAL_ASSET_ENCODING_INVALID');
        height = data.readUInt16BE(offset + 3);
        width = data.readUInt16BE(offset + 5);
        break;
      }
      offset += length;
    }
  } else throw new Error('CERTIFICATE_VISUAL_ASSET_MIME_UNSUPPORTED');
  if (
    !width ||
    !height ||
    width > 4096 ||
    height > 4096 ||
    width * height > 16000000
  )
    throw new Error('CERTIFICATE_VISUAL_ASSET_DIMENSIONS_INVALID');
}
