# ANTIGRAVITY — UI/UX DESIGN RULES & CHECKLIST FOR EVERY SECTION

**Status:** MANDATORY ENGINEERING DIRECTIVE  
**Applies to:** Entire Thing / SecuLayer Frontend  
**Scope:** Every section of your product (Header, Hero, Forms, Cards, Footer, Dashboards, Modals, Drawers)

---

## The Section Checklist

Every section of the product must pass this 18-point checklist before release.

---

### 1. Visual Hierarchy
* **One Primary Focus:** Each section has exactly ONE primary focus (one main heading and one main action).
* **Guiding the Eye:** Structure elements in order of: **Size → Weight → Color → Spacing**.
* **Three Levels of Emphasis:** Never exceed 3 levels of visual emphasis per section (primary, secondary, tertiary).
* **Whitespace as a Tool:** Group related items closely using proximity principles and separate unrelated ones with deliberate whitespace.

---

### 2. Spacing and Layout
* **Strict 8-Point Spacing Scale:** Only use the standard 8-point values: `4px` (`--space-1`), `8px` (`--space-2`), `12px` (`--space-3`), `16px` (`--space-4`), `24px` (`--space-6`), `32px` (`--space-8`), `48px` (`--space-12`), `64px` (`--space-16`). Never use arbitrary magic numbers (`13px`, `17px`, `27px`).
* **Column Grid:** 
  * Desktop (≥1024px): 12-column grid.
  * Tablet (768px – 1023px): 8-column grid.
  * Mobile (<768px): 4-column grid.
* **Consistent Padding:** Maintain uniform internal padding across all cards (`24px` on desktop, `16px` on mobile) and sections (`48px`–`64px` vertical padding).
* **Grid Alignment:** Align all edges cleanly. Misalignment destroys enterprise credibility.
* **Readable Widths:** Max content width capped at `1200px` for general layouts. Body and explanatory prose capped at `60–75 characters per line` (`max-width: 65ch`).

---

### 3. Typography
* **Font Families:** Maximum 2 font families across the entire platform:
  * Primary Sans: `Inter` (UI elements, headers, copy).
  * Monospace: `JetBrains Mono` (code, CVE IDs, hashes, telemetry, OPA rules).
* **Fixed Type Scale:** 
  * `12px` (`--text-xs`): Badges, telemetry, micro metadata.
  * `14px` (`--text-sm`): Dense table cells, secondary captions.
  * `16px` (`--text-base`): Standard body text (minimum for narrative text and forms).
  * `20px` (`--text-lg`): Card headers, modal titles.
  * `24px` (`--text-xl`): Section subheadings.
  * `32px` (`--text-2xl`): Page headers.
  * `48px` (`--text-display`): Hero displays.
* **Line Heights:** Body text strictly `1.5` line height. Headings strictly `1.12` to `1.2`.
* **Font Weights:** Limited to 3 weights: `400` (Regular), `500` / `600` (Medium/Semibold), `700` (Bold).
* **No All-Caps for Long Text:** All-caps is restricted exclusively to short tags/acronyms (e.g., `SAST`, `SOC 2`, `CVE`) under 20 characters.

---

### 4. Color System
* **The 60-30-10 Rule:**
  * **60% Neutral:** Backgrounds and primary surfaces (`#050811`, `#0A0D14`, `#0F172A`, `#FFFFFF`, `#F8FAFC`).
  * **30% Secondary:** Structural borders, cards, muted text, table headers.
  * **10% Accent / Brand:** Primary action color (`#2563EB` / `#38BDF8`) for key CTAs and highlights.
* **Semantic Palette:**
  * **Success:** Green / Emerald (`#10B981`) for passing scans, compliant posture, verified signatures.
  * **Warning:** Amber (`#F59E0B`) for medium findings, pending approvals.
  * **Error / Destructive:** Crimson (`#EF4444`) for critical CVEs, policy violations, deletions.
  * **Info:** Cyan / Sky (`#0284C7` / `#38BDF8`) for informational telemetry.
* **Never Color Alone:** Always pair color with text labels, icons, or numeric indicators for colorblind accessibility.
* **Identical Meaning Everywhere:** Red always means danger/error/destructive. Green always means passing/healthy. Never swap semantic colors for decoration.
* **Intentional Dark Mode:** Calibrated dark surfaces with WCAG contrast, subtle luminous borders, and zero inverted-color artifacts.

---

### 5. Consistency (Design System)
* **Reusable Primitives:** All interfaces must use unified components from `@/components/ui/` (`Button`, `Input`, `Card`, `Badge`, `Modal`, `Toast`, `SectionHeader`).
* **Design Tokens:** Strictly reference design tokens for colors, spacing, borders, radius, and elevation.
* **Predictable Actions:** The same action (e.g., "Export Evidence", "Cancel", "Filter") must look and behave identical across all 9 workspaces.
* **Unified Iconography:** 100% `lucide-react` with consistent 1.5px/2px stroke. Never mix mismatched icon styles.
* **Uniform Corner Radii:**
  * Small elements / badges: `4px` (`--radius-sm`).
  * Inputs and buttons: `6px`–`8px` (`--radius-md`).
  * Cards and panels: `10px`–`12px` (`--radius-lg`).
  * Modals / large containers: `16px` (`--radius-xl`).

---

### 6. Accessibility (Non-Negotiable)
* **Contrast Compliance:** Minimum `4.5:1` contrast ratio for body text, `3:1` for large text and UI boundaries (WCAG 2.1 AA).
* **Keyboard Navigation:** 
  * Full functionality without a mouse (Tab, Enter, Space, Escape, Arrows).
  * High-visibility `:focus-visible` ring on every interactive element (`0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-primary)`).
  * Logical DOM tab order.
* **Minimum Touch Targets:** Minimum `44×44px` (or equivalent touch area) for buttons, links, inputs, and toggles.
* **Labels and ARIA:**
  * Every input must have an associated `<label>` element with `htmlFor` (never use placeholder text as a label substitute).
  * Use proper ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-invalid`, `aria-describedby`, `aria-live`).
  * Alt text on all meaningful images and SVGs.
* **Reduced Motion:** Honor `@media (prefers-reduced-motion: reduce)` by disabling non-essential transitions and animations.

---

### 7. Interaction States
Every interactive element must explicitly implement all required states:
1. **Default:** Clean, accessible resting state.
2. **Hover:** Clear contrast change, cursor change, or elevation lift.
3. **Focus:** Accessible keyboard focus ring (`:focus-visible`).
4. **Active / Pressed:** Subtle inset scale or darkening feedback.
5. **Disabled:** Visual muted treatment (`opacity: 0.5`, `cursor: not-allowed`, `aria-disabled="true"`).
6. **Loading:** Disabled click handler with accessible spinner (`Loader2` or pulse, `aria-busy="true"`).
7. **Error State (Inputs):** Red border, inline error message, `aria-invalid="true"`.
8. **Success State (Inputs):** Green border, checkmark icon, clear confirmation.
9. **Empty States:** When no data exists, display a clear human explanation and a primary NEXT STEP action button (never a blank screen or dead end).
10. **Skeleton States:** Render skeleton loaders during async fetches instead of flash of unstyled content or blank containers.

---

### 8. Navigation & Information Architecture
* **Orientation:** Users must immediately recognize where they are (active nav highlight, breadcrumb trail, page header).
* **Main Navigation Limit:** Capped at 5–7 top-level navigation items.
* **Clear, Familiar Labels:** Use descriptive enterprise industry terms ("Workspaces", "Scans", "Policies", "Incidents", "Settings") rather than clever jargon.
* **3-Click Rule:** Any critical security workflow (Run scan, Review CVE, Deploy policy) reachable in 3 clicks or fewer.
* **Consistent Breadcrumbs:** Deep hierarchy views (Repository → Scan #12 → CVE Detail) must provide breadcrumb trails.

---

### 9. Buttons and Calls to Action (CTAs)
* **One Primary CTA per Section:** Only one dominant button per view/section. All auxiliary actions must be `secondary`, `outline`, or `ghost`.
* **Action-Oriented Verbs:** Use clear imperative labels ("Get Started Free", "Launch Security Scan", "Generate SLSA Attestation", "Export PDF"), never vague words like "Submit", "OK", or "Click Here".
* **Distinct Destructive Actions:** Destructive operations (Delete workspace, Disconnect integration, Revoke key) must use warning/danger styling (`#EF4444`) and require explicit confirmation modal or type-to-confirm dialog.
* **Standard Button Placement:** On desktop dialogs and forms, the primary CTA is on the right, secondary/cancel on the left.

---

### 10. Forms
* **Minimal Friction:** Ask only for necessary data.
* **Single-Column Flow:** Stack form fields vertically for optimal cognitive flow and mobile responsiveness.
* **Labels Above Inputs:** Always place `<label>` visibly above the input field. Placeholders are only for formatting hints.
* **Real-Time Inline Validation:** Provide immediate, specific validation feedback ("Password requires at least 8 characters and 1 special symbol", not "Invalid input").
* **Correct Input Types & Autofill:** Use `type="email"`, `type="password"`, `type="tel"`, `type="number"` with appropriate `autoComplete` attributes.
* **Explicit Optional Markers:** Mark optional fields with `(Optional)` rather than marking every required field when most are required.
* **Preserve Input:** Never wipe form data on validation error or network retry.

---

### 11. Feedback and Communication
* **Fast Micro-Feedback (<100ms):** Visual acknowledgment of clicks and interactions within 100ms. Display spinners for background actions exceeding 1 second.
* **Non-Blocking Toasts:** Use toast notifications for transient confirmations ("Policy Rego rules updated successfully").
* **Human-Readable Error Messages:** Every error state must answer:
  1. What failed?
  2. Why did it fail?
  3. Actionable remediation steps with a direct retry button.
* **Undo Over Confirmation Where Possible:** Support immediate undo for reversible actions (e.g. archiving or tagging).

---

### 12. Responsive and Mobile-First Design
* **Breakpoints:**
  * Mobile: `360px` – `767px`
  * Tablet: `768px` – `1023px`
  * Desktop: `1024px` – `1279px`
  * Wide Desktop: `1280px` – `1440px+`
* **Thumb Zone Navigation:** Primary mobile actions must be positioned within natural thumb reach.
* **No Hover-Only Triggers:** All functionality accessible on touch screens without requiring pointer hover events.

---

### 13. Content and Copywriting
* **Scannable Layouts:** Use descriptive subheadings, short paragraphs, and bullet points.
* **Plain, Authoritative Voice:** Write in clear enterprise terms; avoid unnecessary marketing buzzwords.
* **Important Information First:** Lead with the security posture, key metric, or primary finding before secondary details.
* **Zero Lorem Ipsum:** All previews and interfaces must use real domain content (Semgrep, Gitleaks, CVE-2024-XXXX, OPA Rego).

---

### 14. Motion and Animation
* **Functional Purpose:** Animations must explain transitions (expand drawer, dismiss alert, loading pulse), never serve as distracting decorations.
* **Duration & Easing:** Standard transitions between `150ms` and `300ms` with `ease-out` for entrances and `ease-in` for exits.
* **Non-Blocking:** Animations must never block user input or navigation.
* **Respect Reduced Motion:** Fully disabled or simplified when `prefers-reduced-motion` is active.

---

### 15. Performance as UX
* **Fast Load Times:** Target initial page render under 2 seconds.
* **Optimized Assets:** Lazy-load off-screen components, SVGs, and graphics.
* **Font File Discipline:** Preload only required weights of `Inter` and `JetBrains Mono`.

---

### 16. Trust, Safety, and Ethics
* **Transparency:** Clearly display attestation standards (SLSA Level 3, SOC 2 Type II, ISO 27001, OPA Rego verified).
* **Zero Dark Patterns:** No hidden checkboxes, deceptive default options, or fake urgency counters.
* **Accessible Compliance & Privacy:** Privacy Policy, Terms of Service, Security Disclosures, and direct Contact information prominently linked in the application footer and navigation.

---

### 17. Core UX Laws Applied
| Law | Application in SecuLayer / Thing |
| :--- | :--- |
| **Hick's Law** | Simplify choices: 9 dedicated workspace domains instead of 80 disorganized menu options. |
| **Fitts's Law** | Make primary CTAs prominent with ≥44px touch areas placed in natural focal points. |
| **Jakob's Law** | Adhere to established security & dev tool conventions (GitHub, Datadog, Snyk, AWS console layout). |
| **Miller's Law** | Chunk complex security data into digestible groups (Code, Cloud, Attack, Protect, Agent, SOC). |
| **Law of Proximity** | Group related metrics, badges, and controls inside unified card containers with 8-pt spacing. |
| **Aesthetic-Usability Effect** | Clean enterprise typography, dark-mode styling, and crisp borders increase operator confidence. |
| **Peak-End Rule** | Celebrate completed scan milestones and clear remediation diff views with instant proof. |

---

### 18. Process and Quality Assurance
1. **Design System Adherence:** Verify token compliance (`tokens.css`, `globals.css`).
2. **Interactive States Audit:** Test default, hover, focus-visible, active, disabled, loading, and error states on every control.
3. **Keyboard & Screen Reader Walkthrough:** Validate full tab order, Escape dismissals, and ARIA labels.
4. **Mobile & Viewport Verification:** Test at 360px, 768px, 1024px, and 1440px.
5. **Real Data Verification:** Verify zero mock or hardcoded numbers in compliance with `ui-reality-rules.md`.
