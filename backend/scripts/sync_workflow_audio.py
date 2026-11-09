import os
import subprocess

FFMPEG = r"C:\Users\USER\AppData\Local\Programs\Recordly\resources\app.asar.unpacked\node_modules\ffmpeg-static\ffmpeg.exe"
AUDIO_DIR = os.path.abspath("Kavach-Product-Video/audio")

def build_synced_audio():
    cues = [
        ("wf_01_login.mp3", 1000),      # 1.0s
        ("wf_02_hq.mp3", 15000),        # 15.0s
        ("wf_03_repos.mp3", 33000),     # 33.0s
        ("wf_04_runs.mp3", 50000),      # 50.0s
        ("wf_05_sast.mp3", 65000),      # 65.0s
        ("wf_06_secrets.mp3", 79000),   # 79.0s
        ("wf_07_findings.mp3", 95000),  # 95.0s
        ("wf_08_assistant.mp3", 111000),# 111.0s
        ("wf_09_fixes.mp3", 131000),    # 131.0s
        ("wf_10_outro.mp3", 149000),    # 149.0s
    ]

    inputs = []
    filter_parts = []
    for i, (fn, delay_ms) in enumerate(cues):
        p = os.path.join(AUDIO_DIR, fn)
        inputs.extend(["-i", p])
        filter_parts.append(f"[{i}:a]adelay={delay_ms}|{delay_ms}[a{i}]")

    mix_inputs = "".join([f"[a{i}]" for i in range(len(cues))])
    filter_complex = f"{';'.join(filter_parts)};{mix_inputs}amix=inputs={len(cues)}:normalize=0[outa]"

    out_master = os.path.join(AUDIO_DIR, "master_full_workflow_voiceover.mp3")
    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", filter_complex,
        "-map", "[outa]",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        out_master
    ]
    print("Building synchronized master audio track...", flush=True)
    subprocess.run(cmd, check=True)
    print(f"Master audio saved -> {out_master}", flush=True)
    return out_master

if __name__ == "__main__":
    build_synced_audio()

