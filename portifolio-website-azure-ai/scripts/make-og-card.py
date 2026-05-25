"""
Generate the 1200x630 OpenGraph/Twitter card as a static PNG.
One-time/regen tool — output committed to public/imgs/og-card.png.
Run: python scripts/make-og-card.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PORTRAIT = os.path.join(ROOT, "public", "imgs", "me-removed-better.png")
OUT = os.path.join(ROOT, "public", "imgs", "og-card.png")

FONT_DIRS = ["C:/Windows/Fonts"]
def load_font(size, weight="regular"):
    candidates = {
        "bold": ["segoeuib.ttf", "arialbd.ttf", "Arialbd.ttf"],
        "semibold": ["seguisb.ttf", "segoeuib.ttf", "arialbd.ttf"],
        "regular": ["segoeui.ttf", "arial.ttf", "Arial.ttf"],
    }[weight]
    for d in FONT_DIRS:
        for name in candidates:
            p = os.path.join(d, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    return ImageFont.load_default()

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

# --- background: 3-stop vertical gradient (top -> mid -> bottom) ---
top, mid, bot = (8, 4, 15), (26, 10, 46), (42, 20, 80)
img = Image.new("RGB", (W, H))
d = ImageDraw.Draw(img)
for y in range(H):
    t = y / (H - 1)
    if t < 0.55:
        c = lerp(top, mid, t / 0.55)
    else:
        c = lerp(mid, bot, (t - 0.55) / 0.45)
    d.line([(0, y), (W, y)], fill=c)

img = img.convert("RGBA")
d = ImageDraw.Draw(img)

# --- left accent bar: purple -> fuchsia vertical ---
acc_top, acc_bot = (147, 51, 234), (217, 70, 239)
for y in range(H):
    d.line([(0, y), (13, y)], fill=lerp(acc_top, acc_bot, y / (H - 1)))

# --- portrait backing card (rounded) ---
box_w, box_h = 340, 460
box_x = W - 70 - box_w
box_y = (H - box_h) // 2
backing = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(backing)
bd.rounded_rectangle(
    [box_x, box_y, box_x + box_w, box_y + box_h],
    radius=28, fill=(60, 28, 110, 150), outline=(217, 70, 239, 150), width=2,
)
img = Image.alpha_composite(img, backing)
d = ImageDraw.Draw(img)

# --- portrait (contain within the box) ---
if os.path.exists(PORTRAIT):
    p = Image.open(PORTRAIT).convert("RGBA")
    pad = 8
    scale = min((box_w - pad * 2) / p.width, (box_h - pad * 2) / p.height)
    nw, nh = int(p.width * scale), int(p.height * scale)
    p = p.resize((nw, nh), Image.LANCZOS)
    px = box_x + (box_w - nw) // 2
    py = box_y + (box_h - nh)  # anchor to bottom of the box
    img.paste(p, (px, py), p)
    d = ImageDraw.Draw(img)

# --- text (left column) ---
x = 96
f_label = load_font(26, "regular")
f_name = load_font(86, "bold")
f_sub = load_font(40, "semibold")
f_tag = load_font(25, "regular")

def tracked(draw, pos, text, font, fill, tracking):
    cx, cy = pos
    for ch in text:
        draw.text((cx, cy), ch, font=font, fill=fill)
        cx += draw.textlength(ch, font=font) + tracking

tracked(d, (x, 178), "PORTFOLIO", f_label, (192, 132, 252, 255), 6)
d.text((x, 216), "Ahmed Dlshad", font=f_name, fill=(255, 255, 255, 255))
d.text((x, 330), "Full-Stack & Agentic AI Engineer", font=f_sub, fill=(232, 121, 249, 255))
d.text((x, 398), "MCP agents  ·  multi-model AI  ·  React / Next.js / Node.js",
       font=f_tag, fill=(161, 161, 170, 255))

img.convert("RGB").save(OUT, "PNG")
print("wrote", OUT, img.size)
