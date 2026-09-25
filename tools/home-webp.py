"""Assemble the recorded home frames (.play-local/home-frames, from .play-local/record-home.mjs) into the lossless
animated WebP home background (games/throne-flame/home.webp) and its still (home.png, for reduced motion).
The FriendSDK build has no .gif loader."""
from pathlib import Path
from PIL import Image

def clean_edges(im):
    """The 960 frame is 958 px inside, so the 2x scene is cropped by 1 px and the frame's ink border shows on the
    outermost art pixels: copy the neighbouring row/column over them."""
    w, h = im.size
    for y in range(h):
        im.putpixel((0, y), im.getpixel((1, y))); im.putpixel((w - 1, y), im.getpixel((w - 2, y)))
    for x in range(w):
        im.putpixel((x, 0), im.getpixel((x, 1))); im.putpixel((x, h - 1), im.getpixel((x, h - 2)))
    return im

SHIFT = 40  # the scene sits 40 px lower so the throne clears the logo and tagline (a multiple of 8 keeps the dot grid)

def lower(im):
    out = Image.new('RGB', im.size, (238, 238, 238))
    for y in range(8, SHIFT, 8):
        for x in range(8, im.size[0], 8): out.putpixel((x, y), (176, 176, 176))  # rarefriends.com dot grid
    out.paste(im.crop((0, 0, im.size[0], im.size[1] - SHIFT)), (0, SHIFT))
    return out

frames = [lower(clean_edges(Image.open(p).convert('RGB'))) for p in sorted(Path('.play-local/home-frames').glob('*.png'))]
frames[0].save('games/throne-flame/home.webp', save_all=True, append_images=frames[1:], duration=125, loop=0, lossless=True, method=6)
frames[0].save('games/throne-flame/home.png')
print('home.webp', len(frames), 'frames')
