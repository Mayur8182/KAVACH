import os
import subprocess

FFMPEG = r"C:\Users\USER\AppData\Local\Programs\Recordly\resources\app.asar.unpacked\node_modules\ffmpeg-static\ffmpeg.exe"
AUDIO_DIR = os.path.abspath("Kavach-Product-Video/audio")
RECORDINGS_DIR = os.path.abspath("Kavach-Product-Video/recordings")
ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")
EXPORTS_DIR = os.path.abspath("Kavach-Product-Video/exports")
CLIPS_DIR = os.path.join(EXPORTS_DIR, "clips")

source_video = os.path.join(RECORDINGS_DIR, "recording-1794157315812.mp4")
master_audio = os.path.join(AUDIO_DIR, "master_full_workflow_voiceover.mp3")

intro_card = os.path.join(ASSETS_DIR, "intro_title_card.png")
outro_card = os.path.join(ASSETS_DIR, "outro_title_card.png")
b_hq = os.path.join(ASSETS_DIR, "banner_01_hq.png")
b_repos = os.path.join(ASSETS_DIR, "banner_02_repos.png")
b_runs = os.path.join(ASSETS_DIR, "banner_runs.png")
b_sast = os.path.join(ASSETS_DIR, "banner_sast.png")
b_secrets = os.path.join(ASSETS_DIR, "banner_secrets.png")
b_findings = os.path.join(ASSETS_DIR, "banner_03_findings.png")
b_assistant = os.path.join(ASSETS_DIR, "banner_04_assistant.png")
b_remediation = os.path.join(ASSETS_DIR, "banner_05_remediation.png")

def run_cmd(cmd, desc=""):
    print(f"\n[FFmpeg] {desc}...", flush=True)
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Error: {res.stderr[-500:]}", flush=True)
        raise RuntimeError(f"FFmpeg failed: {desc}")
    print(f"  Done -> {desc}", flush=True)

def main():
    print("=== Compiling Full Platform Workflow Video (All 10 Pages) ===", flush=True)

    # Filter complex for all 10 page lower thirds + intro/outro
    filter_complex = (
        "[0:v]setpts=PTS-STARTPTS[base];"
        "[base][2:v]overlay=0:0:enable='between(t,0,3.5)'[v1];"
        "[v1][3:v]overlay=60:920:enable='between(t,16,26)'[v2];"
        "[v2][4:v]overlay=60:920:enable='between(t,34,44)'[v3];"
        "[v3][5:v]overlay=60:920:enable='between(t,51,61)'[v4];"
        "[v4][6:v]overlay=60:920:enable='between(t,66,75)'[v5];"
        "[v5][7:v]overlay=60:920:enable='between(t,80,89)'[v6];"
        "[v6][8:v]overlay=60:920:enable='between(t,96,105)'[v7];"
        "[v7][9:v]overlay=60:920:enable='between(t,112,122)'[v8];"
        "[v8][10:v]overlay=60:920:enable='between(t,132,142)'[v9];"
        "[v9][11:v]overlay=0:0:enable='between(t,150,158.5)'[outv]"
    )

    full_workflow_mp4 = os.path.join(EXPORTS_DIR, "kavach_full_platform_workflow.mp4")
    cmd_full = [
        FFMPEG, "-y",
        "-i", source_video,
        "-i", master_audio,
        "-i", intro_card,
        "-i", b_hq,
        "-i", b_repos,
        "-i", b_runs,
        "-i", b_sast,
        "-i", b_secrets,
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
        full_workflow_mp4
    ]
    run_cmd(cmd_full, "Compiling Full 10-Page Platform Workflow Video")

    # Also update kavach_full_walkthrough_3min.mp4 with this full workflow
    walkthrough_mp4 = os.path.join(EXPORTS_DIR, "kavach_full_walkthrough_3min.mp4")
    shutil_copy = True
    try:
        import shutil
        shutil.copy2(full_workflow_mp4, walkthrough_mp4)
        print("Updated kavach_full_walkthrough_3min.mp4 with complete 10-page workflow!", flush=True)
    except Exception as e:
        print("Copy error:", e)

    # Feature clips covering scanning to fixing
    clips = [
        ("01_security_hq_overview.mp4", 14.0, 32.0, os.path.join(AUDIO_DIR, "wf_02_hq.mp3"), b_hq),
        ("02_repository_and_scans.mp4", 32.0, 50.0, os.path.join(AUDIO_DIR, "wf_03_repos.mp3"), b_repos),
        ("03_security_runs_pipeline.mp4", 50.0, 64.0, os.path.join(AUDIO_DIR, "wf_04_runs.mp3"), b_runs),
        ("04_sast_and_secrets.mp4", 64.0, 94.0, os.path.join(AUDIO_DIR, "wf_05_sast.mp3"), b_sast),
        ("05_vulnerability_triage.mp4", 94.0, 110.0, os.path.join(AUDIO_DIR, "wf_07_findings.mp3"), b_findings),
        ("06_ai_assistant_investigation.mp4", 110.0, 130.0, os.path.join(AUDIO_DIR, "wf_08_assistant.mp3"), b_assistant),
        ("07_remediation_and_proof.mp4", 130.0, 148.0, os.path.join(AUDIO_DIR, "wf_09_fixes.mp3"), b_remediation),
    ]

    for name, s, e, aud, banner in clips:
        p = os.path.join(CLIPS_DIR, name)
        f_clip = (
            f"[0:v]trim=start={s}:end={e},setpts=PTS-STARTPTS[base];"
            f"[base][2:v]overlay=60:920:enable='between(t,1,{e - s - 1})'[outv]"
        )
        cmd_c = [
            FFMPEG, "-y",
            "-i", source_video,
            "-i", aud,
            "-i", banner,
            "-filter_complex", f_clip,
            "-map", "[outv]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-b:v", "6500k",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            p
        ]
        run_cmd(cmd_c, f"Rendering Feature Clip: {name}")

    print("\n=== ALL COMPLETE WORKFLOW DELIVERABLES COMPILED! ===", flush=True)

if __name__ == "__main__":
    main()

