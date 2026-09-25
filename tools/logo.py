"""Throne & Flame pixel logo (1-bit style): 6x7 glyphs, 2 px strokes, paper outline, signal drop shadow; written to
games/throne-flame/logo.png. Dev tool; run `python3 tools/logo.py` after editing a glyph."""
from PIL import Image

INK, PAPER, SIGNAL = (17, 17, 17, 255), (238, 238, 238, 255), (204, 255, 0, 255)
G = {
    'T': ['######', '######', '..##..', '..##..', '..##..', '..##..', '..##..'],
    'H': ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
    'R': ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
    'O': ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
    'N': ['##..##', '###.##', '######', '##.###', '##..##', '##..##', '##..##'],
    'E': ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
    '&': ['.###..', '##.##.', '.###..', '.###.#', '##.###', '##..#.', '.###.#'],
    'F': ['######', '##....', '##....', '#####.', '##....', '##....', '##....'],
    'L': ['##....', '##....', '##....', '##....', '##....', '##....', '######'],
    'A': ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
    'M': ['##..##', '######', '######', '##..##', '##..##', '##..##', '##..##'],
}
WORD_GAP, LETTER_GAP, PAD = 4, 1, 2

def word_pixels(text):
    px, x = set(), 0
    for ch in text:
        if ch == ' ':
            x += WORD_GAP - LETTER_GAP
            continue
        for y, row in enumerate(G[ch]):
            for dx, c in enumerate(row):
                if c == '#':
                    px.add((x + dx, y))
        x += len(G[ch][0]) + LETTER_GAP
    return px, x - LETTER_GAP

ink, width = word_pixels('THRONE & FLAME')
W, H = width + 2 + PAD * 2, 7 + 2 + PAD * 2
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
put = lambda p, c: img.putpixel((p[0] + PAD, p[1] + PAD), c)
shadow = {(x + 1, y + 1) for (x, y) in ink}
outline = {(x + dx, y + dy) for (x, y) in ink | shadow for dx in (-1, 0, 1) for dy in (-1, 0, 1)}
for p in outline:
    if 0 <= p[0] + PAD < W and 0 <= p[1] + PAD < H: put(p, PAPER)
for p in shadow: put(p, SIGNAL)
for p in ink: put(p, INK)
img.save('games/throne-flame/logo.png')
print('logo', W, 'x', H)
