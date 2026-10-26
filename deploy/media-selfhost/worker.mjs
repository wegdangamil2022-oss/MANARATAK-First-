import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { equal, byteLimit, signatureMatches } from './security.mjs';
const exec = promisify(execFile),
  root = path.resolve(process.env.MEDIA_JOBS_ROOT ?? '/jobs');
const token = (
  await fs.readFile(process.env.MEDIA_WORKER_TOKEN_FILE ?? '/run/secrets/worker_token', 'utf8')
).trim();
if (token.length < 48) throw Error('WORKER_TOKEN_REQUIRED');
let busy = false;
const ffmpegArgs = (mime, input, output) => {
  const common = [
    '-nostdin',
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-protocol_whitelist',
    'file',
    '-threads',
    '1',
    '-i',
    input,
    '-map_metadata',
    '-1',
    '-map_chapters',
    '-1',
    '-threads',
    '1',
  ];
  const formats = {
    'video/mp4': [
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      '-f',
      'mp4',
    ],
    'video/webm': [
      '-map',
      '0:v:0',
      '-map',
      '0:a:0?',
      '-c:v',
      'libvpx-vp9',
      '-deadline',
      'realtime',
      '-cpu-used',
      '8',
      '-c:a',
      'libopus',
      '-f',
      'webm',
    ],
    'audio/mpeg': ['-vn', '-c:a', 'libmp3lame', '-f', 'mp3'],
    'audio/wav': ['-vn', '-c:a', 'pcm_s16le', '-f', 'wav'],
    'audio/x-wav': ['-vn', '-c:a', 'pcm_s16le', '-f', 'wav'],
    'audio/ogg': ['-vn', '-c:a', 'libvorbis', '-f', 'ogg'],
    'image/png': ['-frames:v', '1', '-c:v', 'png', '-f', 'image2'],
    'image/jpeg': ['-frames:v', '1', '-c:v', 'mjpeg', '-f', 'image2'],
  };
  if (!formats[mime]) throw Error('PROCESSOR_FORMAT_UNSUPPORTED');
  return [...common, ...formats[mime], output];
};
export async function sanitizeJob(id, mime) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw Error('JOB_ID_INVALID');
  byteLimit(mime);
  const directory = path.join(root, id),
    input = path.join(directory, 'input'),
    output = path.join(directory, 'output');
  const stat = await fs.lstat(input);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > byteLimit(mime))
    throw Error('JOB_INPUT_INVALID');
  if (mime.startsWith('text/')) {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(await fs.readFile(input));
    if (text.includes('\0') || /[\u0001-\u0008\u000B\u000C\u000E-\u001F]/u.test(text))
      throw Error('TEXT_CONTROL_CHARACTERS');
    // VTT is delivered as text/vtt through a text-only caption track, never as HTML.
    if (
      mime === 'text/vtt' &&
      (!text.startsWith('WEBVTT') || /<\/?(?:script|iframe|object)\b/i.test(text))
    )
      throw Error('VTT_INVALID');
    await fs.writeFile(output, text.replace(/\r\n/g, '\n'), { flag: 'wx', mode: 0o600 });
  } else if (mime === 'application/pdf') {
    // Raster PDF reconstruction removes source actions, attachments and executable objects.
    await exec(
      'gs',
      [
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-dQUIET',
        '-sDEVICE=pdfimage24',
        '-r120',
        `-sOutputFile=${output}`,
        input,
      ],
      { timeout: 90000, maxBuffer: 65536, cwd: directory },
    );
  } else
    await exec('ffmpeg', ffmpegArgs(mime, input, output), {
      timeout: 90000,
      maxBuffer: 65536,
      cwd: directory,
    });
  const outputStat = await fs.lstat(output);
  if (
    !outputStat.isFile() ||
    outputStat.isSymbolicLink() ||
    outputStat.size === 0 ||
    outputStat.size > byteLimit(mime)
  )
    throw Error('PROCESSOR_OUTPUT_INVALID');
  if (!signatureMatches(await fs.readFile(output), mime))
    throw Error('PROCESSOR_SIGNATURE_INVALID');
}
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/ready' && equal(req.headers['x-worker-token'], token)) {
    try {
      await Promise.all([
        exec('ffmpeg', ['-version'], { timeout: 1000, maxBuffer: 65536 }),
        exec('gs', ['--version'], { timeout: 1000, maxBuffer: 4096 }),
      ]);
      res.writeHead(200).end();
    } catch {
      res.writeHead(503).end();
    }
    return;
  }
  if (
    req.method !== 'POST' ||
    req.url !== '/sanitize' ||
    !equal(req.headers['x-worker-token'], token)
  ) {
    res.writeHead(403).end();
    return;
  }
  if (busy) {
    res.writeHead(503).end();
    return;
  }
  busy = true;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 4096) throw Error('JOB_BODY_LIMIT');
      chunks.push(chunk);
    }
    const input = JSON.parse(Buffer.concat(chunks));
    await sanitizeJob(input.id, input.mime);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"processed":true}');
  } catch {
    res
      .writeHead(422, { 'Content-Type': 'application/json' })
      .end('{"error":"PROCESSING_REJECTED"}');
  } finally {
    busy = false;
  }
});
server.requestTimeout = 130000;
server.headersTimeout = 10000;
server.listen(8081, '0.0.0.0');
