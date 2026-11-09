import asyncio
import os
import edge_tts

AUDIO_DIR = os.path.abspath("Kavach-Product-Video/audio")
VOICE = "en-US-ChristopherNeural"

FULL_WORKFLOW_SCRIPTS = [
    {
        "id": "wf_01_login",
        "text": "Welcome to Kavach, the autonomous DevSecOps control plane and AI security engineer. We begin by authenticating into our enterprise workspace."
    },
    {
        "id": "wf_02_hq",
        "text": "The Security HQ command center gives security teams real-time visibility across code, cloud, containers, and AI agents, backed by real database metrics."
    },
    {
        "id": "wf_03_repos",
        "text": "Under Connected Repositories, Kavach synchronizes with GitHub enterprise, tracking branches, commit history, and active security baselines."
    },
    {
        "id": "wf_04_runs",
        "text": "In Security Runs, every scan execution is orchestrated asynchronously. Engineers can inspect live execution stages and raw scanner outputs."
    },
    {
        "id": "wf_05_sast",
        "text": "The SAST Analysis Engine parses abstract syntax trees, identifying tainted dataflows, injection flaws, and security hotspots."
    },
    {
        "id": "wf_06_secrets",
        "text": "Secrets Detection continuously scans commits and configurations, uncovering leaked API keys and hardcoded credentials before deployment."
    },
    {
        "id": "wf_07_findings",
        "text": "The Unified Findings Matrix brings all scanner alerts into one prioritized queue, correlating vulnerabilities against public reachability."
    },
    {
        "id": "wf_08_assistant",
        "text": "The AI Security Assistant acts as an autonomous tier-three analyst, evaluating reachable attack paths and formulating exact remediation plans."
    },
    {
        "id": "wf_09_fixes",
        "text": "In Fixes and Patches, Kavach generates surgical unified diffs and validates every proposed change in an isolated AST sandbox."
    },
    {
        "id": "wf_10_outro",
        "text": "Returning to Security HQ, our security posture is synchronized and verified. From scanning to fixing, this is Kavach."
    }
]

async def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    print("=== Generating 10-Scene Voiceovers for Full Workflow Video ===", flush=True)
    for item in FULL_WORKFLOW_SCRIPTS:
        p = os.path.join(AUDIO_DIR, f"{item['id']}.mp3")
        print(f"Generating: {item['id']}...", flush=True)
        comm = edge_tts.Communicate(item["text"], VOICE, rate="+3%")
        await comm.save(p)
        print(f"  Saved -> {p}", flush=True)
    print("=== All 10 workflow voiceovers generated successfully! ===", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

