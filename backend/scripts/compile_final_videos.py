import os
import subprocess
import glob

FFMPEG = r"C:\Users\USER\AppData\Local\Programs\Recordly\resources\app.asar.unpacked\node_modules\ffmpeg-static\ffmpeg.exe"
AUDIO_DIR = os.path.abspath("Kavach-Product-Video/audio")
RECORDINGS_DIR = os.path.abspath("Kavach-Product-Video/recordings")
ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")
EXPORTS_DIR = os.path.abspath("Kavach-Product-Video/exports")
CLIPS_DIR = os.path.join(EXPORTS_DIR, "clips")

os.makedirs(EXPORTS_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

def run_cmd(cmd, desc=""):
    print(f"\n[FFmpeg] {desc}...", flush=True)
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error executing command: {res.stderr[-500:]}", flush=True)
        raise RuntimeError(f"FFmpeg failed: {desc}")
    print(f"  Done -> {desc}", flush=True)

def stitch_audio(file_list, output_path):
    concat_txt = os.path.join(AUDIO_DIR, "concat_temp.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for audio_file in file_list:
            f.write(f"file '{os.path.abspath(audio_file)}'\n")
    
    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        output_path
    ]
    run_cmd(cmd, f"Stitching master audio to {os.path.basename(output_path)}")
    if os.path.exists(concat_txt):
        os.remove(concat_txt)

def main():
    print("=== Kavach Autonomous Video Production Compiler ===", flush=True)
    
    # 1. Find the video recording
    mp4_files = sorted(glob.glob(os.path.join(RECORDINGS_DIR, "recording-*.mp4")))
    if not mp4_files:
        raise FileNotFoundError("No recording MP4 found in recordings folder!")
    source_video = mp4_files[-1]
    print(f"Using source recording: {source_video}", flush=True)

    # 2. Master Audio - Launch 90s
    launch_audio_files = [
        os.path.join(AUDIO_DIR, f"launch_{i:02d}_{name}.mp3")
        for i, name in [
            (1, "intro"),
            (2, "hq"),
            (3, "repos"),
            (4, "triage"),
            (5, "assistant"),
            (6, "remediation"),
            (7, "outro")
        ]
    ]
    launch_master_audio = os.path.join(AUDIO_DIR, "master_launch_voiceover.mp3")
    stitch_audio(launch_audio_files, launch_master_audio)

    # 3. Master Audio - Walkthrough
    walkthrough_audio_files = [
        os.path.join(AUDIO_DIR, f"walkthrough_{i:02d}_{name}.mp3")
        for i, name in [
            (1, "overview"),
            (2, "hq_dashboard"),
            (3, "repositories"),
            (4, "findings_matrix"),
            (5, "ai_assistant"),
            (6, "fixes_and_patches"),
            (7, "conclusion")
        ]
    ]
    walkthrough_master_audio = os.path.join(AUDIO_DIR, "master_walkthrough_voiceover.mp3")
    stitch_audio(walkthrough_audio_files, walkthrough_master_audio)

    # Assets
    intro_card = os.path.join(ASSETS_DIR, "intro_title_card.png")
    outro_card = os.path.join(ASSETS_DIR, "outro_title_card.png")
    b_hq = os.path.join(ASSETS_DIR, "banner_01_hq.png")
    b_repos = os.path.join(ASSETS_DIR, "banner_02_repos.png")
    b_findings = os.path.join(ASSETS_DIR, "banner_03_findings.png")
    b_assistant = os.path.join(ASSETS_DIR, "banner_04_assistant.png")
    b_remediation = os.path.join(ASSETS_DIR, "banner_05_remediation.png")

    # 4. Compile Kavach Product Launch Video (92s)
    launch_output = os.path.join(EXPORTS_DIR, "kavach_product_launch_90s.mp4")
    
    # Filter complex with lower thirds and intro/outro
    filter_complex = (
        "[0:v]trim=0:92.5,setpts=PTS-STARTPTS[base];"
        # Intro card (0 - 3.5s)
        "[base][2:v]overlay=0:0:enable='between(t,0,3.5)'[v1];"
        # Lower third 1: HQ (16 - 24s)
        "[v1][3:v]overlay=60:920:enable='between(t,16,24)'[v2];"
        # Lower third 2: Repos (33 - 41s)
        "[v2][4:v]overlay=60:920:enable='between(t,33,41)'[v3];"
        # Lower third 3: Findings (48 - 56s)
        "[v3][5:v]overlay=60:920:enable='between(t,48,56)'[v4];"
        # Lower third 4: Assistant (62 - 70s)
        "[v4][6:v]overlay=60:920:enable='between(t,62,70)'[v5];"
        # Lower third 5: Remediation (74 - 82s)
        "[v5][7:v]overlay=60:920:enable='between(t,74,82)'[v6];"
        # Outro card (88 - 92.5s)
        "[v6][8:v]overlay=0:0:enable='between(t,88,92.5)'[outv]"
    )

    cmd_launch = [
        FFMPEG, "-y",
        "-i", source_video,
        "-i", launch_master_audio,
        "-i", intro_card,
        "-i", b_hq,
        "-i", b_repos,
        "-i", b_findings,
        "-i", b_assistant,
        "-i", b_remediation,
        "-i", outro_card,
        "-filter_complex", filter_complex,
        "-map", "[outv]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", "6500k",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        launch_output
    ]
    run_cmd(cmd_launch, "Compiling 90s Product Launch Video (1080p 60fps)")

    # 5. Compile Comprehensive Technical Walkthrough
    walkthrough_output = os.path.join(EXPORTS_DIR, "kavach_full_walkthrough_3min.mp4")
    filter_walkthrough = (
        "[0:v]trim=0:119,setpts=PTS-STARTPTS[base];"
        "[base][2:v]overlay=0:0:enable='between(t,0,4.0)'[v1];"
        "[v1][3:v]overlay=60:920:enable='between(t,18,30)'[v2];"
        "[v2][4:v]overlay=60:920:enable='between(t,36,48)'[v3];"
        "[v3][5:v]overlay=60:920:enable='between(t,54,68)'[v4];"
        "[v4][6:v]overlay=60:920:enable='between(t,74,88)'[v5];"
        "[v5][7:v]overlay=60:920:enable='between(t,94,106)'[v6];"
        "[v6][8:v]overlay=0:0:enable='between(t,114,119)'[outv]"
    )
    cmd_walkthrough = [
        FFMPEG, "-y",
        "-i", source_video,
        "-i", walkthrough_master_audio,
        "-i", intro_card,
        "-i", b_hq,
        "-i", b_repos,
        "-i", b_findings,
        "-i", b_assistant,
        "-i", b_remediation,
        "-i", outro_card,
        "-filter_complex", filter_walkthrough,
        "-map", "[outv]",
        "-map", "1:a",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", "6500k",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        walkthrough_output
    ]
    run_cmd(cmd_walkthrough, "Compiling Full Technical Walkthrough Video (1080p 60fps)")

    # 6. Feature Clips
    clips_config = [
        ("01_security_hq_overview.mp4", 15.0, 29.0, os.path.join(AUDIO_DIR, "clip_01_hq.mp3"), b_hq),
        ("02_repository_and_scans.mp4", 32.0, 46.0, os.path.join(AUDIO_DIR, "clip_02_repos.mp3"), b_repos),
        ("03_vulnerability_triage.mp4", 48.0, 62.0, os.path.join(AUDIO_DIR, "clip_03_findings.mp3"), b_findings),
        ("04_ai_assistant_investigation.mp4", 64.0, 80.0, os.path.join(AUDIO_DIR, "clip_04_assistant.mp3"), b_assistant),
        ("05_remediation_and_proof.mp4", 80.0, 96.0, os.path.join(AUDIO_DIR, "clip_05_fixes.mp3"), b_remediation),
    ]

    for clip_name, start_t, end_t, audio_f, banner in clips_config:
        clip_path = os.path.join(CLIPS_DIR, clip_name)
        filter_clip = (
            f"[0:v]trim=start={start_t}:end={end_t},setpts=PTS-STARTPTS[base];"
            f"[base][2:v]overlay=60:920:enable='between(t,1,{end_t - start_t - 1})'[outv]"
        )
        cmd_clip = [
            FFMPEG, "-y",
            "-i", source_video,
            "-i", audio_f,
            "-i", banner,
            "-filter_complex", filter_clip,
            "-map", "[outv]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-b:v", "6500k",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            clip_path
        ]
        run_cmd(cmd_clip, f"Compiling Feature Clip: {clip_name}")

    print("\n=== ALL VIDEO DELIVERABLES SUCCESSFULLY PRODUCED! ===", flush=True)

if __name__ == "__main__":
    main()

