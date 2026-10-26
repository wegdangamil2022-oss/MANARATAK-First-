export async function fetchCourseMediaBlob(
  grant: { url: string; headers?: Record<string, string>; expiresAt: string | Date },
  maximumBytes = 64 * 1024 * 1024,
): Promise<Blob> {
  const url = new URL(grant.url),
    expires = new Date(grant.expiresAt).getTime();
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    !Number.isFinite(expires) ||
    expires <= Date.now()
  )
    throw Error('COURSE_MEDIA_DELIVERY_GRANT_INVALID');
  const response = await fetch(url, {
    headers: grant.headers,
    credentials: 'omit',
    redirect: 'error',
  });
  if (!response.ok || !response.body) throw Error('COURSE_MEDIA_DELIVERY_FAILED');
  const declared = Number(response.headers.get('Content-Length'));
  if (declared > maximumBytes) {
    await response.body.cancel();
    throw Error('COURSE_MEDIA_DELIVERY_SIZE_LIMIT');
  }
  const reader = response.body.getReader(),
    chunks: Uint8Array<ArrayBuffer>[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > maximumBytes) throw Error('COURSE_MEDIA_DELIVERY_SIZE_LIMIT');
      chunks.push(new Uint8Array(next.value));
    }
  } catch (error) {
    await reader.cancel();
    throw error;
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks, {
    type: response.headers.get('Content-Type')?.split(';')[0] || 'application/octet-stream',
  });
}
