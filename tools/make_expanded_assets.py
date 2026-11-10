"""Generate new player ships, enemy bullets, power-ups, and shield sprites
in the project's authentic pixel art style.

Usage: python3 tools/make_expanded_assets.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from png import read_png, write_png

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'assets', 'img')
CLEAR = (0, 0, 0, 0)


def shade(rgb, factor):
    return tuple(max(0, min(255, int(c * factor))) for c in rgb)


def noise(x, y):
    return (((int(x) * 73856093) ^ (int(y) * 19349663)) % 7 - 3) / 100.0


def mirror(half_rows):
    """Mirror right-aligned half rows into full rows of width 30."""
    full = []
    width = 15
    for r in half_rows:
        r = r.rjust(width, '.')
        full.append(r + r[::-1])
    return full


def draw_frame(rows, palette, w=30, h=15):
    frame = [[CLEAR] * w for _ in range(h)]
    for y, row in enumerate(rows):
        if y >= h:
            break
        for x, ch in enumerate(row):
            if x >= w or ch == '.':
                continue
            base, glow = palette[ch]
            factor = 1.0 if glow else 1.1 - 0.25 * y / h
            frame[y][x] = shade(base, factor + noise(x, y)) + (255,)
    return frame


def make_player_sheet(frame0_rows, palette):
    """Build a 90x15 sprite sheet (frame 0: ship, frame 1: hit/start explode, frame 2: debris)."""
    f0 = draw_frame(frame0_rows, palette, 30, 15)

    # Base explosion debris from original player.png
    orig_player = read_png(os.path.join(IMG, 'player.png'))
    f1_debris = [row[30:60] for row in orig_player]
    f2_debris = [row[60:90] for row in orig_player]

    # Recolor debris to match this ship's primary palette colors
    # Find dominant color in palette
    main_col = list(palette.values())[1][0]
    sec_col = list(palette.values())[0][0]

    def recolor_debris(debris_frame):
        out = []
        for y, row in enumerate(debris_frame):
            new_row = []
            for x, px in enumerate(row):
                if px[3] == 0:
                    new_row.append(CLEAR)
                else:
                    # Tint towards ship color
                    r = int(px[0] * 0.4 + main_col[0] * 0.6)
                    g = int(px[1] * 0.4 + main_col[1] * 0.6)
                    b = int(px[2] * 0.4 + main_col[2] * 0.6)
                    new_row.append((r, g, b, px[3]))
            out.append(new_row)
        return out

    f1 = recolor_debris(f1_debris)
    f2 = recolor_debris(f2_debris)

    # Combine 3 frames into 90x15
    sheet = []
    for y in range(15):
        sheet.append(f0[y] + f1[y] + f2[y])
    return sheet, f0


# --- Ship 2: Swift / Interceptor (Agile, Sleek needle wings, Cyan/Teal) ---
SWIFT_PALETTE = {
    'd': ((10, 60, 75), False),    # dark hull
    'c': ((14, 130, 155), False),  # cyan body
    'b': ((40, 205, 225), False),  # bright cyan wing edge
    'w': ((220, 250, 255), True),  # white cockpit/trim
    'e': ((255, 180, 40), True),   # thruster engine glow
    'E': ((255, 230, 100), True),  # core thruster
}

SWIFT_BODY = mirror([
    'w',
    'cw',
    'ccw',
    'cccw',
    'bcccc',
    'bbcccc',
    'dbbcccc',
    'ddbbcccc',
    'bddbbccw',
    'bbddbbcw',
    'bbbddbcc',
    'cbbbddbe',
    '.cbbddbE',
    '..cbddbe',
    '...c.d..',
])

# --- Ship 3: Titan / Heavy (Broad double-cannon dreadnought, Crimson/Steel) ---
TITAN_PALETTE = {
    'k': ((28, 30, 40), False),    # dark chassis
    's': ((70, 78, 96), False),    # steel armor
    'l': ((130, 142, 168), False), # light plate
    'r': ((185, 35, 45), False),   # crimson heavy plate
    'R': ((240, 70, 80), True),    # bright crimson trim
    'y': ((250, 200, 50), True),   # cockpit / reactor
    'e': ((255, 110, 30), True),   # heavy engine thruster
}

TITAN_BODY = mirror([
    '..yy.',
    '..yy.',
    'ssllss',
    'ssllss',
    'Rkssllss',
    'RRkssllss',
    'RRRkssllss',
    'sRRkkssllk',
    'ssRRkksslk',
    'lsssRRkssk',
    'llsssRRssy',
    'kllsssRRee',
    'kklkss..ee',
    'kk.ks....e',
    'k..k......',
])


def generate_enemy_bullet_scout():
    """Needle laser bolt in emerald/lime green, 3 rotating/pulsing frames of 15x15."""
    frames = []
    # Frame 0: vertical thin sharp needle
    # Frame 1: glowing condensed charge
    # Frame 2: flared needle
    pal = {
        'g': (16, 120, 60),
        'l': (50, 220, 100),
        'w': (220, 255, 230),
    }
    for mode in [0, 1, 2]:
        grid = [[CLEAR] * 15 for _ in range(15)]
        for y in range(2, 13):
            # width profile
            if mode == 0:
                grid[y][7] = pal['w'] + (255,)
                grid[y][6] = pal['l'] + (255,)
                grid[y][8] = pal['l'] + (255,)
                if 4 <= y <= 10:
                    grid[y][5] = pal['g'] + (200,)
                    grid[y][9] = pal['g'] + (200,)
            elif mode == 1:
                grid[y][7] = pal['w'] + (255,)
                grid[y][6] = pal['w'] + (255,)
                grid[y][5] = pal['l'] + (255,)
                grid[y][8] = pal['l'] + (255,)
                grid[y][4] = pal['g'] + (180,)
                grid[y][9] = pal['g'] + (180,)
            else:
                grid[y][7] = pal['w'] + (255,)
                grid[y][6] = pal['l'] + (255,)
                grid[y][8] = pal['l'] + (255,)
                grid[y][5] = pal['l'] + (230,)
                grid[y][9] = pal['l'] + (230,)
        frames.append(grid)

    sheet = []
    for y in range(15):
        sheet.append(frames[0][y] + frames[1][y] + frames[2][y])
    return sheet


def generate_enemy_bullet_tank():
    """Heavy plasma bomb in cobalt blue / molten core, 3 frames of 15x15."""
    frames = []
    for step in [0, 1, 2]:
        grid = [[CLEAR] * 15 for _ in range(15)]
        cx, cy = 7, 7
        for y in range(15):
            for x in range(15):
                dx = x - cx
                dy = y - cy
                dist = math.sqrt(dx * dx + dy * dy)
                if dist <= 5.8:
                    if dist <= 1.8 + (step * 0.4):
                        col = (255, 240, 180)  # white-yellow core
                    elif dist <= 3.8:
                        col = (255, 120, 40) if step % 2 == 0 else (240, 80, 30)  # molten orange
                    else:
                        col = (50, 90, 220)  # cobalt magnetic shell
                    f = 1.05 + noise(x + step * 10, y)
                    grid[y][x] = shade(col, f) + (255,)
        frames.append(grid)

    sheet = []
    for y in range(15):
        sheet.append(frames[0][y] + frames[1][y] + frames[2][y])
    return sheet


def generate_enemy_bullet_elite():
    """Purple/magenta pulsing energy shard, 3 frames of 15x15."""
    frames = []
    for step in [0, 1, 2]:
        grid = [[CLEAR] * 15 for _ in range(15)]
        for y in range(1, 14):
            dy = abs(y - 7)
            w = max(1, 4 - (dy // 2) + (step % 2))
            for x in range(7 - w, 8 + w):
                dist_x = abs(x - 7)
                if dist_x == 0:
                    col = (255, 220, 255)
                elif dist_x <= 2:
                    col = (220, 70, 240)
                else:
                    col = (130, 30, 180)
                grid[y][x] = shade(col, 1.0 + noise(x, y + step * 7)) + (255,)
        frames.append(grid)

    sheet = []
    for y in range(15):
        sheet.append(frames[0][y] + frames[1][y] + frames[2][y])
    return sheet


def generate_powerup_icon(icon_type, size=20):
    """Generate 20x20 circular pixel art powerup pod with border and crisp icon."""
    grid = [[CLEAR] * size for _ in range(size)]
    cx, cy = size // 2, size // 2
    r_outer = 9.2
    r_inner = 7.2

    # Border colors
    border_col = (240, 245, 255)
    border_shd = (100, 110, 135)

    # Background color per power-up type
    bg_colors = {
        'shadow': (30, 20, 55),
        'triple': (50, 40, 15),
        'shield': (15, 40, 65),
        'bomb': (60, 20, 20),
    }
    bg = bg_colors[icon_type]

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= r_outer:
                if dist >= r_inner:
                    # Metallic border with top-left highlight
                    b_col = border_col if (dx + dy < 0) else border_shd
                    grid[y][x] = b_col + (255,)
                else:
                    grid[y][x] = bg + (240,)

    # Draw specific icon inside (within radius 6)
    if icon_type == 'shadow':
        # Two overlapping mini ship silhouettes in cyan/purple
        # Primary silhouette
        for (x, y) in [(10, 6), (9, 7), (10, 7), (11, 7), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8),
                       (7, 9), (8, 9), (12, 9), (13, 9)]:
            grid[y][x] = (60, 220, 255, 255)
        # Shadow clone silhouette behind / offset
        for (x, y) in [(10, 11), (9, 12), (10, 12), (11, 12), (8, 13), (9, 13), (10, 13), (11, 13), (12, 13)]:
            grid[y][x] = (190, 80, 240, 220)

    elif icon_type == 'triple':
        # Three golden laser bolts diverging
        # Center bolt
        for y in range(6, 15):
            grid[y][10] = (255, 240, 100, 255)
            grid[y][9] = (255, 170, 20, 230)
            grid[y][11] = (255, 170, 20, 230)
        # Left bolt
        for y in range(8, 14):
            x = 6 + (14 - y) // 3
            grid[y][x] = (255, 220, 60, 255)
        # Right bolt
        for y in range(8, 14):
            x = 14 - (14 - y) // 3
            grid[y][x] = (255, 220, 60, 255)

    elif icon_type == 'shield':
        # Classic shield emblem in bright cyan and azure
        shield_pts = [
            (8, 6), (9, 6), (10, 6), (11, 6), (12, 6),
            (7, 7), (8, 7), (9, 7), (10, 7), (11, 7), (12, 7), (13, 7),
            (7, 8), (8, 8), (9, 8), (10, 8), (11, 8), (12, 8), (13, 8),
            (7, 9), (8, 9), (9, 9), (10, 9), (11, 9), (12, 9), (13, 9),
            (8, 10), (9, 10), (10, 10), (11, 10), (12, 10),
            (8, 11), (9, 11), (10, 11), (11, 11), (12, 11),
            (9, 12), (10, 12), (11, 12),
            (10, 13),
        ]
        for (x, y) in shield_pts:
            col = (220, 255, 255) if (x == 10 or y == 7) else (40, 170, 240)
            grid[y][x] = col + (255,)

    elif icon_type == 'bomb':
        # Warhead / bomb with sparkling fuse
        # Fuse
        grid[5][11] = (255, 240, 80, 255)  # spark
        grid[6][11] = (255, 140, 20, 255)
        grid[7][10] = (180, 120, 70, 255)
        # Bomb body (circle)
        for y in range(8, 15):
            for x in range(6, 14):
                dx = x - 9.5
                dy = y - 11.0
                if dx * dx + dy * dy <= 12.0:
                    col = (255, 50, 40) if (dx * dx + dy * dy <= 4.0) else (45, 45, 55)
                    grid[y][x] = col + (255,)
        # Highlight on bomb
        grid[9][8] = (240, 240, 255, 255)

    return grid


def generate_shield_bubble(size=46):
    """46x46 translucent energy forcefield bubble."""
    grid = [[CLEAR] * size for _ in range(size)]
    cx, cy = size // 2, size // 2
    r_outer = 21.0
    r_inner = 17.5

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= r_outer:
                if dist >= r_inner:
                    # Rim glow
                    t = (dist - r_inner) / (r_outer - r_inner)
                    # Pulsing ring pattern
                    alpha = int(120 + 120 * math.sin(t * math.pi))
                    grid[y][x] = (80, 210, 255, alpha)
                elif dist >= 13.0:
                    grid[y][x] = (40, 140, 230, 40)
    return grid


def generate_player_shadow_sprite():
    """Semi-transparent spectral clone of player ship."""
    orig_player = read_png(os.path.join(IMG, 'player.png'))
    frame0 = [row[:30] for row in orig_player]
    grid = []
    for row in frame0:
        new_row = []
        for px in row:
            if px[3] == 0:
                new_row.append(CLEAR)
            else:
                # Ethereal cyan/purple glow
                new_row.append((70, 220, 255, 175))
        grid.append(new_row)
    return grid


def main():
    # 1. Player Ships
    sheet_swift, f0_swift = make_player_sheet(SWIFT_BODY, SWIFT_PALETTE)
    sheet_heavy, f0_heavy = make_player_sheet(TITAN_BODY, TITAN_PALETTE)

    write_png(os.path.join(IMG, 'player-swift.png'), sheet_swift)
    write_png(os.path.join(IMG, 'ship-swift.png'), f0_swift)
    print('Wrote player-swift.png and ship-swift.png')

    write_png(os.path.join(IMG, 'player-heavy.png'), sheet_heavy)
    write_png(os.path.join(IMG, 'ship-heavy.png'), f0_heavy)
    print('Wrote player-heavy.png and ship-heavy.png')

    # 2. Enemy Bullets
    write_png(os.path.join(IMG, 'enemy-bullet-scout.png'), generate_enemy_bullet_scout())
    print('Wrote enemy-bullet-scout.png')

    write_png(os.path.join(IMG, 'enemy-bullet-tank.png'), generate_enemy_bullet_tank())
    print('Wrote enemy-bullet-tank.png')

    write_png(os.path.join(IMG, 'enemy-bullet-elite.png'), generate_enemy_bullet_elite())
    print('Wrote enemy-bullet-elite.png')

    # 3. Power-ups
    for p_type in ['shadow', 'triple', 'shield', 'bomb']:
        name = f'powerup-{p_type}.png'
        write_png(os.path.join(IMG, name), generate_powerup_icon(p_type))
        print(f'Wrote {name}')

    write_png(os.path.join(IMG, 'shield-bubble.png'), generate_shield_bubble())
    print('Wrote shield-bubble.png')

    write_png(os.path.join(IMG, 'player-shadow.png'), generate_player_shadow_sprite())
    print('Wrote player-shadow.png')


if __name__ == '__main__':
    main()
