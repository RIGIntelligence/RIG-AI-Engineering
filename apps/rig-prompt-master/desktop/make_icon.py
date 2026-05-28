#!/usr/bin/env python3
import os
import shutil
import struct
import subprocess
import sys
import tempfile
import zlib


BG = (247, 240, 223, 255)
INK = (27, 23, 20, 255)
GOLD = (154, 122, 53, 255)
LINE = (218, 202, 169, 255)
PANEL = (255, 250, 240, 255)
GREEN = (46, 124, 67, 255)

FONT = {
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    "G": ["01111", "10000", "10000", "10111", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "V": ["10001", "10001", "10001", "01010", "01010", "00100", "00100"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
}


def chunk(tag, data):
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path, width, height, pixels):
    raw_rows = []
    stride = width * 4
    for y in range(height):
        start = y * stride
        raw_rows.append(b"\x00" + bytes(pixels[start : start + stride]))
    data = b"".join(raw_rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(data, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as handle:
        handle.write(png)


def rect(pixels, size, x0, y0, x1, y1, color):
    x0 = max(0, int(round(x0 * size)))
    y0 = max(0, int(round(y0 * size)))
    x1 = min(size, int(round(x1 * size)))
    y1 = min(size, int(round(y1 * size)))
    for y in range(y0, y1):
        row = y * size * 4
        for x in range(x0, x1):
            i = row + x * 4
            pixels[i : i + 4] = color


def draw_word(pixels, size, text, x, y, scale, color):
    cursor = x
    for char in text:
        glyph = FONT[char]
        for gy, row in enumerate(glyph):
            for gx, bit in enumerate(row):
                if bit == "1":
                    rect(
                        pixels,
                        size,
                        cursor + gx * scale,
                        y + gy * scale,
                        cursor + (gx + 1) * scale * 0.86,
                        y + (gy + 1) * scale * 0.86,
                        color,
                    )
        cursor += 6 * scale


def draw_icon(path, size):
    pixels = bytearray(BG * size * size)

    rect(pixels, size, 0.06, 0.06, 0.94, 0.94, INK)
    rect(pixels, size, 0.085, 0.085, 0.915, 0.915, PANEL)
    rect(pixels, size, 0.085, 0.085, 0.915, 0.20, GOLD)
    rect(pixels, size, 0.13, 0.255, 0.87, 0.30, LINE)
    rect(pixels, size, 0.13, 0.355, 0.80, 0.385, LINE)
    rect(pixels, size, 0.13, 0.435, 0.73, 0.465, LINE)
    rect(pixels, size, 0.13, 0.62, 0.87, 0.665, INK)
    rect(pixels, size, 0.13, 0.72, 0.70, 0.75, LINE)
    rect(pixels, size, 0.13, 0.80, 0.58, 0.83, LINE)
    rect(pixels, size, 0.77, 0.72, 0.84, 0.79, GREEN)
    rect(pixels, size, 0.83, 0.80, 0.87, 0.84, GOLD)

    draw_word(pixels, size, "RIG", 0.17, 0.115, 0.018, PANEL)
    draw_word(pixels, size, "PM", 0.18, 0.495, 0.042, INK)
    draw_word(pixels, size, "V15", 0.62, 0.50, 0.021, GOLD)

    write_png(path, size, size, pixels)


def main():
    if len(sys.argv) != 2:
        print("usage: make_icon.py /path/to/RIGMasterPrompter.icns", file=sys.stderr)
        return 2

    output = os.path.abspath(sys.argv[1])
    iconutil = shutil.which("iconutil")
    if not iconutil:
        print("iconutil is required on macOS", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory() as temp_dir:
        iconset = os.path.join(temp_dir, "RIGMasterPrompter.iconset")
        os.mkdir(iconset)
        sizes = {
            "icon_16x16.png": 16,
            "icon_16x16@2x.png": 32,
            "icon_32x32.png": 32,
            "icon_32x32@2x.png": 64,
            "icon_128x128.png": 128,
            "icon_128x128@2x.png": 256,
            "icon_256x256.png": 256,
            "icon_256x256@2x.png": 512,
            "icon_512x512.png": 512,
            "icon_512x512@2x.png": 1024,
        }
        for name, size in sizes.items():
            draw_icon(os.path.join(iconset, name), size)
        subprocess.check_call([iconutil, "-c", "icns", iconset, "-o", output])

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
