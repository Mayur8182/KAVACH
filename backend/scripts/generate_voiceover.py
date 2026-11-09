import asyncio
import os
import edge_tts

AUDIO_DIR = os.path.abspath("Kavach-Product-Video/audio")
VOICE = "en-US-ChristopherNeural"  # Authoritative, confident enterprise narrator

LAUNCH_SCRIPTS = [
    {
        "id": "launch_01_intro",
        "text": "Modern software teams ship faster than ever, but security tools remain fragmented, noisy, and blind to real context. Welcome to Kavach, the autonomous DevSecOps control plane and AI security engineer."
    },
    {
        "id": "launch_02_hq",
        "text": "Kavach unifies your entire security posture into a single deterministic command center. No fake metrics, no static checklists. Every score is computed directly from live AST dataflows, secret scanners, and cloud configurations."
    },
    {
        "id": "launch_03_repos",
        "text": "Connect your repositories seamlessly. Kavach doesn't just match regex patterns. It parses abstract syntax trees, tracks tainted user inputs across functions, and detects leaked secrets before they ever reach production."
    },
    {
        "id": "launch_04_triage",
        "text": "In the findings matrix, noisy alerts are replaced by prioritized intelligence. Kavach correlates vulnerabilities against public reachability and real threat models, so your team focuses exclusively on what matters."
    },
    {
        "id": "launch_05_assistant",
        "text": "Meet your autonomous security teammate. Kavach investigates complex attack paths, maps cross-file reachability, and outlines exact surgical remediation strategies in seconds."
    },
    {
        "id": "launch_06_remediation",
        "text": "LLMs propose, but deterministic engines verify. Kavach generates precise code patches, validates them in an isolated AST sandbox, and creates automated pull requests with zero hallucinations."
    },
    {
        "id": "launch_07_outro",
        "text": "Experience true autonomous security engineering. This is Kavach."
    }
]

WALKTHROUGH_SCRIPTS = [
    {
        "id": "walkthrough_01_overview",
        "text": "Welcome to the Kavach technical walkthrough. In this session, we will examine the full architecture of Kavach, an enterprise-grade autonomous security control plane built on the principle: LLMs propose, deterministic security systems decide, and runtime evidence proves."
    },
    {
        "id": "walkthrough_02_hq_dashboard",
        "text": "Starting on the Security HQ dashboard, security leaders and engineering managers get instant visibility across four critical pillars: code security, cloud infrastructure, container workloads, and active AI agents. Every finding is linked to real database records and verifiable scanner outputs."
    },
    {
        "id": "walkthrough_03_repositories",
        "text": "Under Connected Repositories, Kavach synchronizes with GitHub enterprise organizations. Here we inspect the Job Finder service, tracking active branches, historical scan executions, and automated pull request workflows."
    },
    {
        "id": "walkthrough_04_findings_matrix",
        "text": "Moving to the Findings matrix, Kavach aggregates results from multiple scanners: Semgrep for static analysis, Gitleaks for secret detection, and OSV for software composition analysis. Each finding displays precise file locations, code snippets, severity ratings, and contextual triage status."
    },
    {
        "id": "walkthrough_05_ai_assistant",
        "text": "The AI Assistant provides conversational intelligence backed by retrieval augmented generation and deterministic tool execution. When asked to evaluate critical vulnerabilities, the assistant inspects repository ASTs, identifies reachable attack paths, and formulates an actionable response."
    },
    {
        "id": "walkthrough_06_fixes_and_patches",
        "text": "In Fixes and Patches, Kavach provides one-click remediation. Proposed patches include complete unified diffs, remediation rationales, and isolated re-scan verifications to ensure that applying a fix never introduces secondary regressions."
    },
    {
        "id": "walkthrough_07_conclusion",
        "text": "By fusing deterministic security engines with autonomous agentic intelligence, Kavach delivers continuous compliance, zero false-positive fatigue, and production-ready defense for modern engineering organizations."
    }
]

FEATURE_SCRIPTS = [
    {
        "id": "clip_01_hq",
        "text": "Kavach Security HQ: Real-time security posture, multi-cloud visibility, and continuous compliance monitoring."
    },
    {
        "id": "clip_02_repos",
        "text": "Connected Repositories: Deep AST code inspection, automated branch scanning, and developer-friendly workflows."
    },
    {
        "id": "clip_03_findings",
        "text": "Unified Findings Matrix: Zero noise, prioritized triage, and correlated vulnerability intelligence."
    },
    {
        "id": "clip_04_assistant",
        "text": "Autonomous Security Assistant: Context-aware attack path investigation and intelligent security guidance."
    },
    {
        "id": "clip_05_fixes",
        "text": "Deterministic Remediation: Surgical patches, side-by-side diffs, and sandbox verification proof."
    }
]

async def generate_track(items, prefix):
    for item in items:
        file_path = os.path.join(AUDIO_DIR, f"{item['id']}.mp3")
        print(f"Generating voiceover: {item['id']}...", flush=True)
        communicate = edge_tts.Communicate(item["text"], VOICE, rate="+3%")
        await communicate.save(file_path)
        print(f"  Saved -> {file_path}", flush=True)

async def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    print("=== Generating Voiceovers for Kavach Product Video ===", flush=True)
    await generate_track(LAUNCH_SCRIPTS, "launch")
    await generate_track(WALKTHROUGH_SCRIPTS, "walkthrough")
    await generate_track(FEATURE_SCRIPTS, "clip")
    print("=== All voiceover tracks successfully generated! ===", flush=True)

if __name__ == "__main__":
    asyncio.run(main())

