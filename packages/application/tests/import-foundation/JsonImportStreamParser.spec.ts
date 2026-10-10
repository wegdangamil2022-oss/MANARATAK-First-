import { describe, expect, it } from 'vitest';
import { JsonImportStreamParser } from '../../src/import-foundation/parsers/JsonImportStreamParser';
import type { ParsedImportRow } from '@manaratak/domain';
async function parse(bytes: Uint8Array, size = 7) {
  async function* chunks() { for (let at = 0; at < bytes.length; at += size) yield bytes.subarray(at, at + size); }
  const rows: ParsedImportRow[] = [];
  for await (const row of new JsonImportStreamParser().parse(chunks(), { batchId: 'b', chunkSize: 1 })) rows.push(row);
  return rows;
}
describe('bounded JSON artifact parser', () => {
  it('preserves Unicode, escaped delimiters, nested values and byte offsets across split bytes', async () => {
    const first = JSON.stringify({ name: 'منارتك', nested: { values: [1, 2] }, text: '"}\\' });
    const document = `[${first}, {"id":2}]`;
    const rows = await parse(Buffer.from(document), 1);
    expect(rows.map(row => row.raw)).toEqual([JSON.parse(first), { id: 2 }]);
    expect(rows.map(row => row.recordOffset)).toEqual([1, Buffer.byteLength(`[${first}, `)]);
    expect(rows.map(row => row.chunkIndex)).toEqual([0, 1]);
  });
  it('accepts one object and empty arrays', async () => {
    expect((await parse(Buffer.from('{"id":1}')))[0].raw).toEqual({ id: 1 });
    expect(await parse(Buffer.from('[ ]'))).toEqual([]);
  });
  it.each(['[{"id":1},]', '[{"id":1}', '{"id":1} false', '[1]', '{"id":}', '[{"id":1}{"id":2}]'])('refuses malformed document %s', async document => {
    await expect(parse(Buffer.from(document))).rejects.toThrow('IMPORT_JSON_');
  });
  it('refuses invalid UTF-8 and rows over the resource ceiling', async () => {
    await expect(parse(Buffer.from([123,34,97,34,58,34,255,34,125]))).rejects.toThrow('IMPORT_JSON_SYNTAX_INVALID');
    await expect(parse(Buffer.from(JSON.stringify({ text: 'a'.repeat(1024 * 1024) })), 65536)).rejects.toThrow('IMPORT_ROW_SIZE_LIMIT');
  });
});
