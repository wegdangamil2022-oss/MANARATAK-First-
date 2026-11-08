import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
/** Fixed 16-bit byte LZW, bounded to 65,536 dictionary entries. This is only
 * lossless transport encoding, not encryption. PostgreSQL verifies SHA-256
 * before decoding JSON; the anonymous block creates no schema objects. */
export function courseTransportStatement(table, keys, rows) {
  const identifier = (value) => {
    assert.match(value, /^[A-Za-z][A-Za-z0-9]*$/);
    return '"' + value + '"';
  };
  const bytes = Buffer.from(JSON.stringify(rows));
  assert.ok(bytes.length > 0 && bytes.length <= 8 * 1024 * 1024);
  const dictionary = new Map(),
    codes = [];
  let next = 256,
    prefix = bytes[0];
  for (let i = 1; i < bytes.length; i++) {
    const byte = bytes[i],
      key = prefix * 256 + byte,
      found = dictionary.get(key);
    if (found !== undefined) prefix = found;
    else {
      codes.push(prefix);
      if (next < 65536) dictionary.set(key, next++);
      prefix = byte;
    }
  }
  codes.push(prefix);
  const encoded = Buffer.alloc(codes.length * 2);
  codes.forEach((code, index) => encoded.writeUInt16BE(code, index * 2));
  const columns = keys.map(identifier).join(','),
    relation = identifier(table),
    hash = createHash('sha256').update(bytes).digest('hex');
  const sql = `DO $course_transport$
DECLARE packed bytea := decode('${encoded.toString('base64')}','base64');
 dictionary bytea[] := ARRAY[]::bytea[]; pieces bytea[] := ARRAY[]::bytea[];
 previous bytea; entry bytea; decoded bytea; code int; next_code int := 256;
 position int; output_position int := 1; inserted int;
BEGIN
 IF octet_length(packed)>16777216 OR octet_length(packed)%2<>0 THEN RAISE EXCEPTION 'COURSE_TRANSPORT_SIZE'; END IF;
 FOR position IN 0..255 LOOP dictionary[position+1]:=decode(lpad(to_hex(position),2,'0'),'hex'); END LOOP;
 code:=get_byte(packed,0)*256+get_byte(packed,1); previous:=dictionary[code+1];
 IF previous IS NULL THEN RAISE EXCEPTION 'COURSE_TRANSPORT_FIRST_CODE'; END IF;
 pieces[1]:=previous;
 FOR position IN 1..(octet_length(packed)/2-1) LOOP
  code:=get_byte(packed,position*2)*256+get_byte(packed,position*2+1);
  IF code<next_code THEN entry:=dictionary[code+1];
  ELSIF code=next_code THEN entry:=previous||substring(previous from 1 for 1);
  ELSE RAISE EXCEPTION 'COURSE_TRANSPORT_CODE'; END IF;
  output_position:=output_position+1; pieces[output_position]:=entry;
  IF next_code<65536 THEN dictionary[next_code+1]:=previous||substring(entry from 1 for 1); next_code:=next_code+1; END IF;
  previous:=entry;
 END LOOP;
 SELECT string_agg(piece,''::bytea ORDER BY ordinal) INTO decoded FROM unnest(pieces) WITH ORDINALITY AS item(piece,ordinal);
 IF octet_length(decoded)<>${bytes.length} OR encode(sha256(decoded),'hex')<>'${hash}' THEN RAISE EXCEPTION 'COURSE_TRANSPORT_HASH'; END IF;
 INSERT INTO ${relation} (${columns}) SELECT ${columns} FROM jsonb_populate_recordset(NULL::${relation},convert_from(decoded,'UTF8')::jsonb);
 GET DIAGNOSTICS inserted=ROW_COUNT;
 IF inserted<>${rows.length} THEN RAISE EXCEPTION 'COURSE_TRANSPORT_COUNT'; END IF;
END $course_transport$;
SELECT jsonb_build_object('copied',${rows.length});`;
  return { sql, sourceBytes: bytes.length, transportBytes: Buffer.byteLength(sql) };
}
