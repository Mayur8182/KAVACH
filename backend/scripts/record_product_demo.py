import os
import sys
import time
import math
import json
import shutil
from playwright.sync_api import sync_playwright

RAW_DIR = os.path.abspath("Kavach-Product-Video/recordings/raw")
RECORDINGS_DIR = os.path.abspath("Kavach-Product-Video/recordings")
RECORDLY_ROAMING_DIR = r"C:\Users\USER\AppData\Roaming\Recordly\recordings"
ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")

WIDTH = 1920
HEIGHT = 1080

class SmoothCursorRecorder:
    def __init__(self, page):
        self.page = page
        self.samples = []
        self.start_time = time.time()
        self.cur_x = WIDTH // 2
        self.cur_y = HEIGHT // 2
        self.record_sample("move", "arrow")

    def elapsed_ms(self):
        return int((time.time() - self.start_time) * 1000)

    def record_sample(self, interaction_type="move", cursor_type="arrow"):
        cx = max(0.0, min(1.0, self.cur_x / float(WIDTH)))
        cy = max(0.0, min(1.0, self.cur_y / float(HEIGHT)))
        self.samples.append({
            "timeMs": self.elapsed_ms(),
            "cx": cx,
            "cy": cy,
            "interactionType": interaction_type,
            "cursorType": cursor_type
        })

    def move_to(self, target_x, target_y, duration_ms=600, steps=25):
        start_x, start_y = self.cur_x, self.cur_y
        step_time = (duration_ms / 1000.0) / max(1, steps)

        for i in range(1, steps + 1):
            t = i / float(steps)
            # Smooth cubic ease-in-out
            ease = 0.5 - 0.5 * math.cos(math.pi * t)
            
            # Subtle natural curvature
            drift = math.sin(t * math.pi) * 8.0
            
            x = start_x + (target_x - start_x) * ease + drift
            y = start_y + (target_y - start_y) * ease - drift * 0.5

            self.cur_x = x
            self.cur_y = y
            try:
                self.page.mouse.move(x, y)
            except Exception:
                pass
            self.record_sample("move", "arrow")
            time.sleep(step_time)

        self.cur_x = target_x
        self.cur_y = target_y
        try:
            self.page.mouse.move(target_x, target_y)
        except Exception:
            pass
        self.record_sample("move", "arrow")

    def click_at(self, target_x, target_y, duration_ms=500):
        self.move_to(target_x, target_y, duration_ms=duration_ms)
        time.sleep(0.12)
        try:
            self.page.mouse.down()
        except Exception:
            pass
        self.record_sample("click", "pointer")
        time.sleep(0.15)
        try:
            self.page.mouse.up()
        except Exception:
            pass
        self.record_sample("move", "arrow")
        time.sleep(0.15)

    def hover_element(self, selector, timeout=5000, duration_ms=500):
        try:
            self.page.wait_for_selector(selector, timeout=timeout)
            box = self.page.locator(selector).first.bounding_box()
            if box:
                tx = box["x"] + box["width"] / 2.0
                ty = box["y"] + box["height"] / 2.0
                self.move_to(tx, ty, duration_ms=duration_ms)
                return True
        except Exception as e:
            print(f"Warning: could not hover {selector}: {e}", flush=True)
        return False

    def click_element(self, selector, timeout=5000, duration_ms=500):
        try:
            self.page.wait_for_selector(selector, timeout=timeout)
            box = self.page.locator(selector).first.bounding_box()
            if box:
                tx = box["x"] + box["width"] / 2.0
                ty = box["y"] + box["height"] / 2.0
                self.click_at(tx, ty, duration_ms=duration_ms)
                return True
        except Exception as e:
            print(f"Warning: could not click {selector}: {e}", flush=True)
        return False

    def smooth_scroll(self, delta_y=400, steps=15, step_delay=0.03):
        dy_per_step = delta_y / float(steps)
        for _ in range(steps):
            try:
                self.page.mouse.wheel(0, dy_per_step)
            except Exception:
                pass
            self.record_sample("move", "arrow")
            time.sleep(step_delay)


def run_recording():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)

    timestamp = int(time.time() * 1000)
    print(f"=== Starting Autonomous Demo Recording (Session: {timestamp}) ===", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="msedge",
            headless=True,
            args=[
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--font-render-hinting=medium",
                "--enable-font-antialiasing"
            ]
        )

        context = browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
            record_video_dir=RAW_DIR,
            record_video_size={"width": WIDTH, "height": HEIGHT}
        )

        page = context.new_page()
        recorder = SmoothCursorRecorder(page)

        print("[Scene 1/7] Navigating to Login...", flush=True)
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.wait_for_selector("#login-email", timeout=10000)
        time.sleep(1.0)

        # Move to email input and type
        print("  Typing credentials for demo account...", flush=True)
        recorder.click_element("#login-email", duration_ms=700)
        page.type("#login-email", "demo@kavach.security", delay=65)
        time.sleep(0.4)

        # Move to password input and type
        recorder.click_element("#login-password", duration_ms=600)
        page.type("#login-password", "KavachDemo2026!", delay=75)
        time.sleep(0.6)

        # Click Sign In button
        print("  Submitting login form...", flush=True)
        recorder.click_element("button[type='submit']", duration_ms=600)
        time.sleep(3.5)

        # Scene 2: Security HQ / Overview
        print("[Scene 2/7] Exploring Security HQ Overview...", flush=True)
        recorder.click_element("aside a[href='/overview'], nav a[href='/overview']", duration_ms=700)
        page.wait_for_timeout(2500)

        # Highlight key posture cards
        print("  Inspecting Posture Metrics & Risk Breakdown...", flush=True)
        recorder.move_to(450, 220, duration_ms=800)
        time.sleep(1.5)
        recorder.move_to(800, 220, duration_ms=700)
        time.sleep(1.5)
        recorder.move_to(1150, 220, duration_ms=700)
        time.sleep(1.5)
        recorder.move_to(1500, 220, duration_ms=700)
        time.sleep(1.5)

        # Scroll down smoothly to show activity feed
        print("  Scrolling down to Security Activity...", flush=True)
        recorder.smooth_scroll(delta_y=350, steps=20, step_delay=0.04)
        time.sleep(2.5)
        recorder.move_to(960, 580, duration_ms=800)
        time.sleep(2.0)
        recorder.smooth_scroll(delta_y=-350, steps=20, step_delay=0.04)
        time.sleep(1.5)

        # Scene 3: Connected Repositories
        print("[Scene 3/7] Inspecting Repositories...", flush=True)
        recorder.click_element("aside a[href='/repositories'], nav a[href='/repositories']", duration_ms=700)
        page.wait_for_timeout(3000)

        recorder.move_to(650, 320, duration_ms=800)
        time.sleep(2.0)
        recorder.move_to(1100, 320, duration_ms=800)
        time.sleep(2.0)

        # Check Security Runs
        print("  Navigating to Security Runs...", flush=True)
        recorder.click_element("aside a[href='/runs'], nav a[href='/runs']", duration_ms=700)
        page.wait_for_timeout(3000)
        recorder.move_to(960, 400, duration_ms=800)
        time.sleep(2.5)

        # Scene 4: Findings Matrix & Triage
        print("[Scene 4/7] Navigating to Findings Matrix...", flush=True)
        recorder.click_element("aside a[href='/findings'], nav a[href='/findings']", duration_ms=700)
        page.wait_for_timeout(3000)

        # Hover over severity badges and filters
        print("  Filtering and inspecting findings...", flush=True)
        recorder.move_to(520, 240, duration_ms=700)
        time.sleep(1.5)
        recorder.move_to(750, 240, duration_ms=600)
        time.sleep(1.5)

        # Click first finding row to expand details if clickable
        recorder.move_to(600, 380, duration_ms=700)
        recorder.click_at(600, 380, duration_ms=400)
        time.sleep(3.0)

        # Scene 5: AI Security Assistant
        print("[Scene 5/7] Conversing with AI Security Assistant...", flush=True)
        recorder.click_element("aside a[href='/assistant'], nav a[href='/assistant']", duration_ms=700)
        page.wait_for_timeout(3000)

        # Click query input
        recorder.click_element("#chat-query-input", duration_ms=700)
        prompt_text = "Which critical issues are actually reachable from public API endpoints, and which one should we fix first?"
        print(f"  Typing prompt: '{prompt_text}'...", flush=True)
        page.type("#chat-query-input", prompt_text, delay=40)
        time.sleep(0.8)

        # Click send or press Enter
        recorder.click_element("button[title*='Send'], button:has-text('Send'), #chat-query-input ~ div button", duration_ms=500)
        try:
            page.keyboard.press("Enter")
        except Exception:
            pass

        print("  Waiting for AI analysis to stream...", flush=True)
        # Give assistant time to query RAG and render
        page.wait_for_timeout(6000)
        recorder.smooth_scroll(delta_y=280, steps=15, step_delay=0.04)
        time.sleep(3.0)

        # Scene 6: Fixes & Patches
        print("[Scene 6/7] Examining Fixes & Patches...", flush=True)
        recorder.click_element("aside a[href='/fixes'], nav a[href='/fixes']", duration_ms=700)
        page.wait_for_timeout(3000)

        print("  Inspecting Unified Diffs and AST Verification...", flush=True)
        recorder.move_to(700, 350, duration_ms=800)
        time.sleep(2.0)
        recorder.move_to(1200, 450, duration_ms=800)
        time.sleep(2.5)

        # Scene 7: Outro Return to Security HQ
        print("[Scene 7/7] Outro return to Security HQ...", flush=True)
        recorder.click_element("aside a[href='/overview'], nav a[href='/overview']", duration_ms=700)
        page.wait_for_timeout(3000)
        recorder.move_to(960, 400, duration_ms=1000)
        time.sleep(3.0)

        print("=== Recording Journey Finished, Closing Browser Context... ===", flush=True)
        page.close()
        video_path = page.video.path() if page.video else None
        context.close()
        browser.close()

    print(f"Raw video captured at: {video_path}", flush=True)
    if not video_path or not os.path.exists(video_path):
        raise RuntimeError("Video recording was not generated by Playwright.")

    # Target filenames for Recordly compatibility
    base_name = f"recording-{timestamp}"
    mp4_name = f"{base_name}.mp4"
    cursor_name = f"{base_name}.mp4.cursor.json"
    session_name = f"{base_name}.recordly-session.json"
    diag_name = f"{base_name}.recording-diagnostics.json"

    local_mp4 = os.path.join(RECORDINGS_DIR, mp4_name)
    local_cursor = os.path.join(RECORDINGS_DIR, cursor_name)
    local_session = os.path.join(RECORDINGS_DIR, session_name)
    local_diag = os.path.join(RECORDINGS_DIR, diag_name)

    # 1. Convert WebM to MP4 using Recordly's FFmpeg
    ffmpeg_exe = r"C:\Users\USER\AppData\Local\Programs\Recordly\resources\app.asar.unpacked\node_modules\ffmpeg-static\ffmpeg.exe"
    print(f"Transcoding raw video to high-bitrate 60fps MP4: {local_mp4} ...", flush=True)
    import subprocess
    cmd = [
        ffmpeg_exe, "-y",
        "-i", video_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-r", "60",
        "-pix_fmt", "yuv420p",
        local_mp4
    ]
    subprocess.run(cmd, check=True)
    print("Transcoding completed successfully!", flush=True)

    # 2. Write Recordly cursor metadata
    cursor_data = {
        "version": 2,
        "samples": recorder.samples
    }
    with open(local_cursor, "w", encoding="utf-8") as f:
        json.dump(cursor_data, f, indent=2)

    # 3. Write Recordly session metadata
    session_data = {
        "version": 2,
        "videoFileName": mp4_name,
        "webcamFileName": None,
        "timeOffsetMs": 0
    }
    with open(local_session, "w", encoding="utf-8") as f:
        json.dump(session_data, f, indent=2)

    # 4. Write Recordly diagnostics metadata
    file_size = os.path.getsize(local_mp4)
    diag_data = {
        "version": 1,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "videoPath": local_mp4,
        "diagnosticsPath": local_diag,
        "events": [
            {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "backend": "windows-wgc",
                "phase": "stop",
                "outputPath": local_mp4,
                "systemAudioPath": None,
                "microphonePath": None,
                "processOutput": f"Encoder bitrate: 24000000 bps for 1920x1080@60fps\r\nRecording started\r\nRecording stopped. Output path: {local_mp4}",
                "details": {
                    "fileSizeBytes": file_size,
                    "durationSeconds": recorder.elapsed_ms() / 1000.0
                },
                "media": {
                    "video": {
                        "path": local_mp4,
                        "exists": True,
                        "sizeBytes": file_size,
                        "containerDurationSeconds": recorder.elapsed_ms() / 1000.0
                    }
                }
            }
        ]
    }
    with open(local_diag, "w", encoding="utf-8") as f:
        json.dump(diag_data, f, indent=2)

    # 5. Mirror directly to Recordly Roaming folder so Recordly sees it immediately
    if os.path.exists(RECORDLY_ROAMING_DIR):
        print(f"Mirroring recording package to Recordly library: {RECORDLY_ROAMING_DIR} ...", flush=True)
        shutil.copy2(local_mp4, os.path.join(RECORDLY_ROAMING_DIR, mp4_name))
        shutil.copy2(local_cursor, os.path.join(RECORDLY_ROAMING_DIR, cursor_name))
        shutil.copy2(local_session, os.path.join(RECORDLY_ROAMING_DIR, session_name))
        shutil.copy2(local_diag, os.path.join(RECORDLY_ROAMING_DIR, diag_name))

    # Also copy session to recordly-projects
    shutil.copy2(local_session, os.path.join("Kavach-Product-Video/recordly-projects", session_name))

    print("=== Demo Video Capture & Recordly Sync Complete! ===", flush=True)
    print(f"Video file: {local_mp4} ({file_size / 1024 / 1024:.2f} MB)", flush=True)
    print(f"Cursor samples: {len(recorder.samples)} recorded", flush=True)
    return local_mp4, timestamp

if __name__ == "__main__":
    run_recording()

