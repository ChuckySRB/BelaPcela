import { Inflate } from 'fflate';
import { DomainError } from '../domain/validation';

export const MAX_ARCHIVE_BYTES = 250 * 1024 * 1024;
export const MAX_JSON_BYTES = 10 * 1024 * 1024;
export const MAX_ARCHIVE_FILES = 2002;
const fail = () => new DomainError('ZIP није исправан или прелази ограничења: 250 MB, 2.000 датотека, 25 MB по датотеци и 10 MB по JSON документу.');
const safePath = (path: string) => path === 'manifest.json' || path === 'family.json' || /^data\/(photos|documents|audio|videos)\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(path);
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => { let value = i; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1; return value >>> 0; });

/** Read the central directory before inflation, then count real output and check CRCs.
 * No archive paths are ever written to the host filesystem. ZIP64/encryption are unsupported.
 */
export async function readBoundedZip(bytes: Uint8Array): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
  try {
    if (bytes.length > MAX_ARCHIVE_BYTES || bytes.length < 22) throw fail();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (at: number) => view.getUint16(at, true); const u32 = (at: number) => view.getUint32(at, true);
    let end = bytes.length - 22;
    while (end >= Math.max(0, bytes.length - 65557) && (u32(end) !== 0x06054b50 || end + 22 + u16(end + 20) !== bytes.length)) end--;
    if (end < 0 || u32(end) !== 0x06054b50 || u16(end + 4) || u16(end + 6)) throw fail();
    const count = u16(end + 10); const centralSize = u32(end + 12); const centralOffset = u32(end + 16);
    if (!count || count > MAX_ARCHIVE_FILES || count !== u16(end + 8) || centralOffset + centralSize !== end) throw fail();
    const entries: { name: string; size: number; compressed: number; offset: number; method: number; crc: number }[] = [];
    const names = new Set<string>(); const ranges: [number, number][] = []; let declared = 0; let cursor = centralOffset;
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (let i = 0; i < count; i++) {
      if (u32(cursor) !== 0x02014b50) throw fail();
      const flags = u16(cursor + 8); const method = u16(cursor + 10); const size = u32(cursor + 24); const compressed = u32(cursor + 20); const offset = u32(cursor + 42);
      const nameLength = u16(cursor + 28); const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      const unixKind = (u32(cursor + 38) >>> 16) & 0xf000;
      if (!safePath(name) || names.has(name) || flags & 0x41 || ![0, 8].includes(method) || u16(cursor + 34) || unixKind === 0xa000) throw fail();
      names.add(name); declared += size;
      if (size > (name.endsWith('.json') && !name.startsWith('data/') ? MAX_JSON_BYTES : 25 * 1024 * 1024) || declared > MAX_ARCHIVE_BYTES) throw fail();
      if (u32(offset) !== 0x04034b50 || u16(offset + 6) !== flags || u16(offset + 8) !== method) throw fail();
      const localNameLength = u16(offset + 26); const start = offset + 30 + localNameLength + u16(offset + 28);
      if (decoder.decode(bytes.subarray(offset + 30, offset + 30 + localNameLength)) !== name || start + compressed > centralOffset) throw fail();
      ranges.push([offset, start + compressed]); entries.push({ name, size, compressed, offset: start, method, crc: u32(cursor + 16) });
      cursor += 46 + nameLength + u16(cursor + 30) + u16(cursor + 32);
    }
    if (cursor !== end) throw fail();
    ranges.sort((a, b) => a[0] - b[0]);
    if (ranges[0][0] !== 0 || ranges.some((range, i) => i > 0 && range[0] < ranges[i - 1][1])) throw fail();
    const result = new Map<string, Uint8Array<ArrayBuffer>>(); let actual = 0;
    for (const entry of entries) {
      const chunks: Uint8Array[] = []; let length = 0; let crc = 0xffffffff; let finished = false;
      const accept = (chunk: Uint8Array, final: boolean) => {
        length += chunk.length; actual += chunk.length;
        if (length > entry.size || actual > MAX_ARCHIVE_BYTES) throw fail();
        for (const byte of chunk) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
        chunks.push(chunk.slice()); finished = final;
      };
      if (entry.method === 0) accept(bytes.subarray(entry.offset, entry.offset + entry.compressed), true);
      else {
        const inflate = new Inflate(accept);
        for (let at = 0; at < entry.compressed; at += 8192) {
          inflate.push(bytes.subarray(entry.offset + at, entry.offset + Math.min(at + 8192, entry.compressed)), at + 8192 >= entry.compressed);
          if (at % (256 * 1024) === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
      if (!finished || length !== entry.size || ((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw fail();
      const data = new Uint8Array(length); let at = 0; for (const chunk of chunks) { data.set(chunk, at); at += chunk.length; }
      result.set(entry.name, data);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return result;
  } catch (cause) { if (cause instanceof DomainError) throw cause; throw fail(); }
}
