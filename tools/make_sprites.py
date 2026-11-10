"""Generate extra enemy sprite sheets in the style of assets/img/invader.png.

Each sheet is 135x36: three 45x36 frames (wings/legs pose A, pose B, explosion).
Shapes are drawn as half pixel maps that get mirrored, then shaded with a soft
top-to-bottom gradient and slight per-pixel variation like the original art.

Usage: python3 tools/make_sprites.py [preview.png]
"""
import colorsys
import os
import sys

from png import read_png, write_png

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'assets', 'img')
FRAME_W, FRAME_H = 45, 36
CLEAR = (0, 0, 0, 0)


def mirror(half_rows):
    """Right-aligned half rows (ending at the center column) -> full rows."""
    width = max(len(r) for r in half_rows)
    full = []
    for r in half_rows:
        r = r.rjust(width, '.')
        full.append(r + r[:-1][::-1])
    return full


def shade(rgb, factor):
    return tuple(max(0, min(255, int(c * factor))) for c in rgb)


def noise(x, y):
    # Deterministic tiny variation (the original art has ~180 shades).
    return ((x * 73856093 ^ y * 19349663) % 7 - 3) / 100.0


def draw(rows, palette, top):
    """Render a full pixel map centered horizontally in a 45x36 frame."""
    frame = [[CLEAR] * FRAME_W for _ in range(FRAME_H)]
    width = len(rows[0])
    left = (FRAME_W - width) // 2
    height = len(rows)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            base, glow = palette[ch]
            # Glowing parts keep their color; the body darkens towards the bottom.
            factor = 1.0 if glow else 1.08 - 0.28 * y / height
            frame[top + y][left + x] = shade(base, factor + noise(x, y)) + (255,)
    return frame


def sheet(frames):
    return [sum((f[y] for f in frames), []) for y in range(FRAME_H)]


def original_explosion():
    inv = read_png(os.path.join(IMG, 'invader.png'))
    return [row[2 * FRAME_W:3 * FRAME_W] for row in inv]


# --- Scout: small, fast dart with flapping wings ---------------------------

SCOUT_PALETTE = {
    'd': ((16, 78, 52), False),    # dark body
    'b': ((22, 120, 74), False),   # body
    'l': ((40, 160, 96), False),   # light body
    'w': ((24, 96, 88), False),    # wing membrane
    'a': ((230, 140, 20), True),   # glow (dim)
    'A': ((255, 200, 40), True),   # glow
}

# Wasp-like: glowing eye, wings swept down (A) and raised (B), stinger glow.
SCOUT_A = [
    '..........ddb',
    '.........dbll',
    '.........dbAA',
    '.........dbaA',
    'w.......ddbbl',
    'dw.....dbbbbl',
    '.dww..dbbbbll',
    '..dwwwdbbbbbl',
    '...ddwdbbbbbl',
    '.....adbbbbbb',
    '.......dbbbbb',
    '........dbbbl',
    '.........dbbb',
    '..........dbb',
    '...........da',
    '............A',
]

SCOUT_B = [
    '..........ddb',
    '.........dbll',
    'w........dbAA',
    'dw.......dbaA',
    '.dww....ddbbl',
    '..dwww.dbbbbl',
    '...ddwwdbbbll',
    '.....adbbbbbl',
    '.......dbbbbl',
    '.......dbbbbb',
    '.......dbbbbb',
    '........dbbbl',
    '.........dbbb',
    '..........dbb',
    '...........da',
    '............a',
]


# --- Tank: wide armored saucer, takes two hits ------------------------------

TANK_PALETTE = {
    'o': ((34, 42, 64), False),    # plate seams
    'd': ((52, 64, 92), False),    # dark armor
    'b': ((78, 94, 130), False),   # armor
    'l': ((112, 132, 170), False), # light armor
    'h': ((150, 170, 205), False), # highlight
    'g': ((60, 60, 70), False),    # cannon
    'a': ((220, 70, 20), True),    # core glow (dim)
    'A': ((255, 120, 40), True),   # core glow
}

TANK_A = [
    'dbbb',
    'dbllll',
    'dbllhhhh',
    'dbllhhhhhh',
    'odbbllAllAll',
    'odbbbbbbbbbbbb',
    'oooooooooooooooo',
    'obbbbobbbbobbbaA',
    'odddoodddooddoaA',
    '.odd..oddo.oddaA',
    '..gg...gg...ooaa',
    '..gg...gg.......',
    '..aa............',
]

TANK_B = [
    'dbbb',
    'dbllll',
    'dbllhhhh',
    'dbllhhhhhh',
    'odbbllallall',
    'odbbbbbbbbbbbb',
    'oooooooooooooooo',
    'obbbbobbbbobbbaA',
    'odddoodddooddoaA',
    '.odd..oddo.oddoa',
    '...gg...gg..ooAA',
    '...gg...gg......',
    '...aa...........',
]


# --- Elite: the original invader recolored ---------------------------------

def recolor_invader():
    inv = read_png(os.path.join(IMG, 'invader.png'))
    out = []
    for row in inv:
        new = []
        for x, (r, g, b, a) in enumerate(row):
            if a == 0 or x >= 2 * FRAME_W:  # keep the explosion frame as is
                new.append((r, g, b, a))
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if h < 0.06 or h > 0.9:      # reds -> deep purple
                h = 0.78
            elif 0.12 < h < 0.35:        # lime glow -> cyan glow
                h = 0.5
                v = min(1.0, v * 1.1)
            nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
            new.append((int(nr * 255), int(ng * 255), int(nb * 255), a))
        out.append(new)
    return out


def main():
    boom = original_explosion()

    scout = sheet([
        draw(mirror(SCOUT_A), SCOUT_PALETTE, 10),
        draw(mirror(SCOUT_B), SCOUT_PALETTE, 10),
        boom,
    ])
    tank = sheet([
        draw(mirror(TANK_A), TANK_PALETTE, 9),
        draw(mirror(TANK_B), TANK_PALETTE, 9),
        boom,
    ])
    elite = recolor_invader()

    sheets = {'enemy-scout.png': scout, 'enemy-tank.png': tank, 'enemy-elite.png': elite}
    for name, pixels in sheets.items():
        write_png(os.path.join(IMG, name), pixels)
        print('wrote assets/img/' + name)

    if len(sys.argv) > 1:
        bg = (40, 40, 70, 255)
        inv = read_png(os.path.join(IMG, 'invader.png'))
        all_rows = []
        for pixels in [inv] + list(sheets.values()):
            all_rows += [[px if px[3] else bg for px in row] for row in pixels]
            all_rows += [[(20, 20, 35, 255)] * (3 * FRAME_W)]
        write_png(sys.argv[1], all_rows, 6)


if __name__ == '__main__':
    main()
