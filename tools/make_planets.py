"""Generate pixel art planets in the style of the game's assets.

Uses tools/png.py to output crisp pixel art PNGs with transparent backgrounds,
custom palettes matching the game's color scheme, spherical lighting,
subtle surface detail, dithering, and atmospheric rim glow.

Usage: python3 tools/make_planets.py
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from png import write_png

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'assets', 'img')
CLEAR = (0, 0, 0, 0)


def noise(x, y):
    """Deterministic tiny variation matching make_sprites.py."""
    return (((int(x) * 73856093) ^ (int(y) * 19349663)) % 7 - 3) / 100.0


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def shade(rgb, factor):
    return (clamp(rgb[0] * factor), clamp(rgb[1] * factor), clamp(rgb[2] * factor))


def normalize3(x, y, z):
    l = math.sqrt(x * x + y * y + z * z)
    if l == 0:
        return 0, 0, 1
    return x / l, y / l, z / l


# Directional light coming from top-left, slightly in front
LX, LY, LZ = normalize3(-0.6, -0.65, 0.5)


def generate_gas_giant(size=88):
    """Large gas giant with swirling atmospheric bands and an elliptical ring."""
    R = 30  # Planet radius
    cx = size // 2
    cy = size // 2
    grid = [[CLEAR] * size for _ in range(size)]

    # Ring parameters
    # The ring is tilted. Semi-major axis A, semi-minor axis B.
    # Ring inner radius r1, outer radius r2
    ring_a_in, ring_b_in = 36, 12
    ring_a_out, ring_b_out = 43, 15

    # Base colors for gas giant: deep cosmic purple / indigo / amber bands (alien colors)
    palette_bands = [
        (65, 35, 95),    # deep purple
        (110, 48, 115),  # magenta-purple
        (165, 75, 120),  # rose
        (215, 115, 70),  # warm amber/orange
        (180, 85, 90),   # muted red-pink
        (130, 55, 105),  # violet
        (85, 40, 100),   # dark violet
    ]

    ring_color_outer = (180, 140, 175)
    ring_color_inner = (130, 95, 140)
    ring_shadow = (45, 30, 55)

    # First pass: back half of the ring (y < cy)
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            # Rotate slightly for a tilt of ~12 degrees
            tilt = math.radians(14)
            rx = dx * math.cos(tilt) - dy * math.sin(tilt)
            ry = dx * math.sin(tilt) + dy * math.cos(tilt)

            dist_sq = (rx / ring_a_out) ** 2 + (ry / ring_b_out) ** 2
            dist_sq_in = (rx / ring_a_in) ** 2 + (ry / ring_b_in) ** 2

            if dist_sq <= 1.0 and dist_sq_in >= 1.0:
                # Behind planet check: if ry < 0 (back part of ring) and inside planet circle
                is_back = ry < 0
                dist_center = math.sqrt(dx * dx + dy * dy)
                if is_back and dist_center <= R:
                    continue  # Behind the planet!
                if is_back:
                    t = (dist_sq - (ring_a_in / ring_a_out) ** 2) / (1.0 - (ring_a_in / ring_a_out) ** 2)
                    base = ring_color_inner if t < 0.5 else ring_color_outer
                    # Subtly shade back ring
                    f = 0.75 + noise(x, y)
                    grid[y][x] = shade(base, f) + (230,)

    # Second pass: the planet sphere
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= R:
                # 3D sphere normal
                nx = dx / R
                ny = dy / R
                nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))

                # Atmospheric bands with turbulence
                # Latitude wave
                lat = (ny + 1.0) * 0.5
                wave = math.sin(lat * 18.0 + math.cos(nx * 4.0) * 0.8) * 0.5 + 0.5
                band_idx = int(lat * len(palette_bands) + wave * 0.8) % len(palette_bands)
                base_color = palette_bands[band_idx]

                # Diffuse lighting
                dot = nx * LX + ny * LY + nz * LZ
                diffuse = max(0.05, dot)

                # Terminator falloff
                light_factor = diffuse * 1.15 + (nz * 0.2) + noise(x, y)

                # Shadow of the front ring cast onto planet
                tilt = math.radians(14)
                rx = dx * math.cos(tilt) - dy * math.sin(tilt)
                ry = dx * math.sin(tilt) + dy * math.cos(tilt)
                # Cast shadow slightly down-right
                s_rx = rx + 1.0
                s_ry = ry + 4.0
                s_dist_sq = (s_rx / ring_a_out) ** 2 + (s_ry / ring_b_out) ** 2
                s_dist_sq_in = (s_rx / ring_a_in) ** 2 + (s_ry / ring_b_in) ** 2
                if s_dist_sq <= 1.0 and s_dist_sq_in >= 1.0 and ry > 0:
                    light_factor *= 0.45

                # Edge rim lighting
                rim = math.pow(1.0 - nz, 2.5) * 0.25
                light_factor += rim

                pixel = shade(base_color, light_factor)
                grid[y][x] = pixel + (255,)

    # Third pass: front half of the ring (ry >= 0)
    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            tilt = math.radians(14)
            rx = dx * math.cos(tilt) - dy * math.sin(tilt)
            ry = dx * math.sin(tilt) + dy * math.cos(tilt)

            dist_sq = (rx / ring_a_out) ** 2 + (ry / ring_b_out) ** 2
            dist_sq_in = (rx / ring_a_in) ** 2 + (ry / ring_b_in) ** 2

            if dist_sq <= 1.0 and dist_sq_in >= 1.0:
                is_front = ry >= 0
                if is_front:
                    # In front of planet!
                    t = (dist_sq - (ring_a_in / ring_a_out) ** 2) / (1.0 - (ring_a_in / ring_a_out) ** 2)
                    base = ring_color_inner if (0.2 < t < 0.7) else ring_color_outer
                    # Ring receives sunlight
                    f = 1.05 + noise(x, y)
                    grid[y][x] = shade(base, f) + (245,)

    return grid


def generate_desert_planet(size=52):
    """Medium rocky/desert planet with craters and terracotta/amber continents."""
    R = 23
    cx = size // 2
    cy = size // 2
    grid = [[CLEAR] * size for _ in range(size)]

    sand_base = (195, 115, 50)
    rust_base = (145, 60, 35)
    crater_dark = (90, 35, 25)
    dune_light = (235, 160, 80)

    # Pre-defined crater spots: (cx_norm, cy_norm, radius)
    craters = [
        (-0.35, -0.2, 5),
        (0.25, -0.4, 4),
        (-0.1, 0.3, 6),
        (0.4, 0.2, 3),
        (-0.5, 0.35, 3),
    ]

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= R:
                nx = dx / R
                ny = dy / R
                nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))

                # Continents / terrain bands
                terrain = math.sin(nx * 5.0 + math.sin(ny * 7.0)) * 0.5 + 0.5
                if terrain > 0.65:
                    col = dune_light
                elif terrain > 0.35:
                    col = sand_base
                else:
                    col = rust_base

                # Crater check
                for cx_norm, cy_norm, cr_r in craters:
                    cdx = dx - cx_norm * R
                    cdy = dy - cy_norm * R
                    c_dist = math.sqrt(cdx * cdx + cdy * cdy)
                    if c_dist <= cr_r:
                        if c_dist >= cr_r - 1.2:
                            col = dune_light  # crater rim
                        else:
                            col = crater_dark

                dot = nx * LX + ny * LY + nz * LZ
                diffuse = max(0.05, dot)
                factor = diffuse * 1.2 + (nz * 0.15) + noise(x, y)

                grid[y][x] = shade(col, factor) + (255,)

    return grid


def generate_ice_planet(size=48):
    """Medium oceanic / ice planet in turquoise, emerald and cyan hues."""
    R = 20
    cx = size // 2
    cy = size // 2
    grid = [[CLEAR] * size for _ in range(size)]

    deep_ocean = (18, 55, 90)
    emerald_sea = (24, 110, 115)
    ice_cyan = (90, 205, 215)
    ice_white = (210, 245, 255)

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= R:
                nx = dx / R
                ny = dy / R
                nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))

                # Swirling clouds and polar ice caps
                swirl = math.sin(nx * 4.0 + ny * 6.0 + math.cos(nx * 3.0) * 2.0)
                polar = abs(ny)

                if polar > 0.78:
                    col = ice_white
                elif swirl > 0.4:
                    col = ice_white if swirl > 0.8 else ice_cyan
                elif swirl > -0.2:
                    col = emerald_sea
                else:
                    col = deep_ocean

                dot = nx * LX + ny * LY + nz * LZ
                diffuse = max(0.06, dot)
                factor = diffuse * 1.22 + (nz * 0.18) + noise(x, y)

                # Atmospheric glow rim
                atmosphere = math.pow(1.0 - nz, 3) * 0.35
                factor += atmosphere

                grid[y][x] = shade(col, factor) + (255,)

    return grid


def generate_moon(size=28):
    """Small barren rocky moon with grey-slate tones and crater depressions."""
    R = 12
    cx = size // 2
    cy = size // 2
    grid = [[CLEAR] * size for _ in range(size)]

    rock_light = (175, 185, 205)
    rock_mid = (120, 130, 150)
    rock_dark = (70, 75, 95)
    crater_inner = (45, 50, 68)

    craters = [
        (-0.25, -0.3, 3),
        (0.3, 0.15, 2.5),
        (-0.15, 0.4, 2),
    ]

    for y in range(size):
        for x in range(size):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= R:
                nx = dx / R
                ny = dy / R
                nz = math.sqrt(max(0.0, 1.0 - nx * nx - ny * ny))

                col = rock_mid
                # Crater check
                for cx_norm, cy_norm, cr_r in craters:
                    cdx = dx - cx_norm * R
                    cdy = dy - cy_norm * R
                    c_dist = math.sqrt(cdx * cdx + cdy * cdy)
                    if c_dist <= cr_r:
                        col = rock_light if c_dist >= cr_r - 0.8 else crater_inner

                dot = nx * LX + ny * LY + nz * LZ
                diffuse = max(0.04, dot)
                factor = diffuse * 1.18 + noise(x, y)

                grid[y][x] = shade(col, factor) + (255,)

    return grid


def main():
    planets = {
        'planet-gas.png': generate_gas_giant(88),
        'planet-desert.png': generate_desert_planet(52),
        'planet-ice.png': generate_ice_planet(48),
        'planet-moon.png': generate_moon(28),
    }

    for name, grid in planets.items():
        out_path = os.path.join(IMG, name)
        write_png(out_path, grid)
        print(f'Wrote {out_path} ({len(grid[0])}x{len(grid)})')


if __name__ == '__main__':
    main()
