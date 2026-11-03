# SYNTHUX — EVIDENCE-BASED UX ISSUE DETECTION & DIRECTIVES

This rule enforces the `ux-audit` skill (`.agents/skills/ux-audit/SKILL.md`) across all frontend code in this repository.

## Strict Removals (Non-Negotiable)
- **No product tours, onboarding walkthroughs, or guided tours** (including Shepherd.js, tour modals, and compass dropdowns).
- **No generic documentation drawers, help centers, or UX education**.
- **No generic recommendations** unrelated to a detected problem.
- **No unsupported heuristic scores** or fabricated issues (never assign default 50/100).
- **No automatic redesign suggestions** when no concrete usability problem exists.

## 9 Target Evaluation Categories for Real Application
1. **Broken controls & navigation**: Broken buttons, links, event handlers, and navigation routes.
2. **Duplication**: Duplicate pages, components, actions, and overlapping functionality.
3. **Wayfinding context**: Incorrect active navigation, missing breadcrumbs, and unclear current-page context.
4. **Workflows & dead ends**: Broken end-to-end workflows and dead ends.
5. **Data truth & states**: Incorrect counts, inconsistent states, and misleading success messages.
6. **UI states**: Missing, broken, or confusing loading, empty, and error states.
7. **Layout & responsiveness**: Layout overflow, clipped content, overlapping components, and responsive defects.
8. **Accessibility (WCAG 2.1 AA)**: Contrast ratio (< 4.5:1), keyboard navigation, focus indicators (`focus:ring-2`), missing labels, and broken semantic structure.
9. **UI noise & confusion**: Unnecessary UI components and redundant information that demonstrably confuse users.

## Evidence Requirements
- Inspect the actual page and interact with available controls where safe.
- Capture the exact route, affected element, observed behavior, and supporting screenshot or DOM evidence.
- Distinguish confirmed defects from suspected problems.
- Never infer a broken interaction solely from its appearance.
- Never invent findings, measurements, test results, or scores.
- If a check cannot be performed, report it as unverified rather than failed.

## Mandatory Issue Report Format
For each confirmed issue:
- **Issue title**
- **Severity**: Critical / High / Medium / Low
- **Page URL and affected component**
- **Actual observed behavior**
- **Expected behavior**
- **Reproduction steps**
- **Evidence** (DOM snippet, route, console/network trace)
- **Suggested code-level fix**
- **Verification status**: Confirmed / Suspected / Unverified

