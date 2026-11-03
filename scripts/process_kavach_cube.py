import os
from PIL import Image

src_path = r"C:\Users\USER\.gemini\antigravity-ide\brain\44dfa55f-cf86-41d3-af9b-6b2d130d993f\.user_uploaded\media_1793341771416.png"
out_dir = r"c:\Users\USER\Desktop\YC THING\frontend\public"

im = Image.open(src_path).convert("RGBA")
width, height = im.size

# Find bounding box of dark pixels
pixels = im.load()
min_x, min_y, max_x, max_y = width, height, 0, 0
for y in range(height):
    for x in range(width):
        r, g, b, a = pixels[x, y]
        # Dark pixel if brightness < 150
        brightness = (r + g + b) // 3
        if brightness < 180:
            if x < min_x: min_x = x
            if x > max_x: max_x = x
            if y < min_y: min_y = y
            if y > max_y: max_y = y

padding = 4
crop_box = (
    max(0, min_x - padding),
    max(0, min_y - padding),
    min(width, max_x + padding + 1),
    min(height, max_y + padding + 1)
)

cropped = im.crop(crop_box)
c_w, c_h = cropped.size

# 1. Dark cube with transparent background
cube_dark = Image.new("RGBA", (c_w, c_h), (0, 0, 0, 0))
cd_pixels = cube_dark.load()
cr_pixels = cropped.load()

for y in range(c_h):
    for x in range(c_w):
        r, g, b, a = cr_pixels[x, y]
        brightness = (r + g + b) / 3.0
        # Map brightness (0 to 255) to alpha for dark strokes
        # If white (255) -> alpha = 0. If dark (17) -> alpha = 255.
        if brightness >= 240:
            cd_pixels[x, y] = (0, 0, 0, 0)
        else:
            alpha = int(max(0, min(255, (255 - brightness) * (255 / (255 - 17)))))
            cd_pixels[x, y] = (17, 23, 41, alpha)

cube_dark_path = os.path.join(out_dir, "kavach-cube.png")
cube_dark.save(cube_dark_path, "PNG")
print(f"Saved {cube_dark_path} (size: {c_w}x{c_h})")

# 2. White cube with transparent background (for dark mode)
cube_white = Image.new("RGBA", (c_w, c_h), (0, 0, 0, 0))
cw_pixels = cube_white.load()

for y in range(c_h):
    for x in range(c_w):
        r, g, b, a = cd_pixels[x, y]
        if a > 0:
            cw_pixels[x, y] = (255, 255, 255, a)

cube_white_path = os.path.join(out_dir, "kavach-cube-white.png")
cube_white.save(cube_white_path, "PNG")
print(f"Saved {cube_white_path} (size: {c_w}x{c_h})")
