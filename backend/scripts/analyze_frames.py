import glob
from PIL import Image
import numpy as np

def analyze_frames():
    frames = sorted(glob.glob("Kavach-Product-Video/assets/frames/frame_*.png"))
    print(f"Total frames: {len(frames)}")
    for i, f in enumerate(frames):
        im = Image.open(f)
        arr = np.array(im)
        # Check variance/mean across regions
        # Sidebar region: x in [0, 240], y in [100, 700]
        sidebar_mean = arr[100:700, 0:240].mean()
        # Main content region: x in [250, 1800], y in [100, 800]
        content_mean = arr[100:800, 250:1800].mean()
        content_std = arr[100:800, 250:1800].std()
        print(f"Frame {i+1} ({i*10}s) [{f}]: content_mean={content_mean:.1f}, std={content_std:.1f}")

if __name__ == "__main__":
    analyze_frames()

