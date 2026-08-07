"""Generate the 1024x500 Play Store feature graphic.

    python3 scripts/make-feature-graphic.py screenshots/android/feature-graphic-1024x500.png

The old one centred the square icon on pale blue with dead margins either side.
This rebuilds the starfield full-bleed and continues the moon horizon across the
whole width, then drops in the logo lockup cropped out of the icon -- both sit
on the same near-black space, so the seam disappears.
"""
from PIL import Image, ImageDraw, ImageFilter
import random, sys, os

random.seed(7)
W, H = 1024, 500
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICON = os.path.join(ROOT, "screenshots/android/play-icon-512.png")
OUT = sys.argv[1]

# --- background: vertical gradient in the icon's deep-space purple ----------
bg = Image.new("RGB", (W, H))
d = ImageDraw.Draw(bg)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(8 + 16 * t), int(4 + 8 * t), int(12 + 26 * t)))

# --- stars -----------------------------------------------------------------
star = ImageDraw.Draw(bg)
for _ in range(300):
    x, y = random.randrange(W), random.randrange(int(H * 0.88))
    v = random.randint(70, 235)
    r = 1 if random.random() < 0.82 else 2
    star.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, min(255, v + 12)))

# a few coloured sparkles with cross flares, matching the icon's accents
FLARE = [(255, 246, 196), (255, 236, 130), (232, 120, 255), (120, 230, 255), (255, 255, 255)]
flares = Image.new("RGB", (W, H), (0, 0, 0))
fd = ImageDraw.Draw(flares)
for _ in range(16):
    x = random.randrange(40, W - 40)
    y = random.randrange(20, int(H * 0.8))
    c = random.choice(FLARE)
    L = random.randint(14, 34)
    fd.line([(x - L, y), (x + L, y)], fill=c)
    fd.line([(x, y - L), (x, y + L)], fill=c)
    fd.ellipse([x - 3, y - 3, x + 3, y + 3], fill=c)
flares = flares.filter(ImageFilter.GaussianBlur(1.6))
import PIL.ImageChops as IC
bg = IC.screen(bg, flares)

# --- moon horizon along the bottom ----------------------------------------
MOON_TOP = H - 78
R = 1500
cx, cy = W // 2, MOON_TOP + R
moon = Image.new("RGB", (W, H), (0, 0, 0))
md = ImageDraw.Draw(moon)
md.ellipse([cx - R, cy - R, cx + R, cy + R], fill=(128, 137, 150))
mask = Image.new("L", (W, H), 0)
ImageDraw.Draw(mask).ellipse([cx - R, cy - R, cx + R, cy + R], fill=255)
# craters + shading so it is not a flat band
cd = ImageDraw.Draw(moon)
for _ in range(70):
    x = random.randrange(-50, W + 50)
    y = random.randrange(MOON_TOP - 6, H + 30)
    rr = random.randint(4, 26)
    sh = random.randint(-26, 16)
    cd.ellipse([x - rr, y - rr, x + rr, y + rr],
               fill=(max(0, 128 + sh), max(0, 137 + sh), max(0, 150 + sh)))
moon = moon.filter(ImageFilter.GaussianBlur(2.2))
# darken toward the left/right edges so it reads as a sphere
shade = Image.new("L", (W, H), 255)
sd = ImageDraw.Draw(shade)
for x in range(W):
    t = abs(x - W * 0.42) / (W * 0.62)
    sd.line([(x, 0), (x, H)], fill=int(max(70, 255 - 190 * t * t)))
moon = Image.composite(moon, Image.new("RGB", (W, H), (10, 10, 16)), shade.point(lambda v: v))
mask = mask.filter(ImageFilter.GaussianBlur(1.2))
bg.paste(moon, (0, 0), mask)

# soft glow where the horizon meets space
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([cx - R, cy - R, cx + R, cy + R], outline=(120, 140, 190), width=6)
glow = glow.filter(ImageFilter.GaussianBlur(9))
bg = IC.screen(bg, glow)

# --- logo lockup, cropped out of the icon above its own moon ---------------
icon = Image.open(ICON).convert("RGB")
logo = icon.crop((30, 50, 482, 412))            # excludes the icon's moon
target_h = 322
logo = logo.resize((int(logo.width * target_h / logo.height), target_h), Image.LANCZOS)
lx, ly = (W - logo.width) // 2, 44

# The lockup is bright artwork on near-black, so composite by taking the
# lighter of the two rather than pasting a rectangle. The icon's own space is
# a shade lighter than this gradient, though, so crush its black point first --
# otherwise the crop's background wins the comparison and reappears as a halo.
BP = 34
logo = logo.point(lambda v: 0 if v < BP else int((v - BP) * 255 / (255 - BP)))
box = (lx, ly, lx + logo.width, ly + logo.height)
bg.paste(IC.lighter(bg.crop(box), logo), box)

# --- vignette --------------------------------------------------------------
vig = Image.new("L", (W, H), 0)
ImageDraw.Draw(vig).ellipse([-W * 0.3, -H * 0.55, W * 1.3, H * 1.5], fill=255)
vig = vig.filter(ImageFilter.GaussianBlur(120))
bg = Image.composite(bg, Image.new("RGB", (W, H), (4, 2, 8)), vig)

bg.convert("RGB").save(OUT)
print("wrote", OUT, bg.size)
