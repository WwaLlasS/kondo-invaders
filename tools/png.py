"""Minimal PNG read/write (RGBA, 8-bit) with no dependencies."""
import struct
import zlib


def read_png(path):
    data = open(path, 'rb').read()
    pos, idat = 8, b''
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        chunk = data[pos + 8:pos + 8 + length]
        if kind == b'IHDR':
            width, height, depth, color = struct.unpack('>IIBB', chunk[:10])
            assert depth == 8 and color == 6, 'only 8-bit RGBA PNGs are supported'
        elif kind == b'IDAT':
            idat += chunk
        pos += 12 + length
    raw = zlib.decompress(idat)
    stride, bpp = width * 4, 4
    pixels, prev, offset = [], bytearray(stride), 0
    for _ in range(height):
        filt = raw[offset]
        line = bytearray(raw[offset + 1:offset + 1 + stride])
        offset += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if filt == 1:
                line[x] = (line[x] + a) & 255
            elif filt == 2:
                line[x] = (line[x] + b) & 255
            elif filt == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif filt == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        pixels.append([tuple(line[x * 4:x * 4 + 4]) for x in range(width)])
        prev = line
    return pixels


def write_png(path, pixels, scale=1):
    rows = [[px for px in row for _ in range(scale)] for row in pixels for _ in range(scale)]
    height, width = len(rows), len(rows[0])
    raw = b''.join(b'\x00' + bytes(v for px in row for v in px) for row in rows)

    def chunk(kind, body):
        return struct.pack('>I', len(body)) + kind + body + struct.pack('>I', zlib.crc32(kind + body))

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)))
        f.write(chunk(b'IDAT', zlib.compress(raw, 9)))
        f.write(chunk(b'IEND', b''))
