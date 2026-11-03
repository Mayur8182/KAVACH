# ANTIGRAVITY — UI/UX MASTER RULES

## 1. Core Design Principle
The product must look like a real enterprise security platform, not an AI-generated SaaS template.
UI must prioritize clarity, trust, usability, and operational information.
Every screen must have a clear purpose.
Every displayed metric must come from real backend data.
Every action button must perform a real action.
Every form must submit to a real API.
Every table must support real data states.
Never create UI merely because “the page needs something there.”

---

## 2. Visual Language

### Use:
- White / off-white backgrounds
- Black / dark-gray primary text
- Gray borders
- Neutral surfaces
- Subtle shadows
- Minimal rounded corners
- Professional typography
- Dense but readable enterprise layouts
- Consistent spacing
- Clear hierarchy

### Avoid:
- ❌ Blue-heavy SaaS designs
- ❌ Neon colors
- ❌ Purple AI gradients
- ❌ Excessive glassmorphism
- ❌ Huge rounded cards
- ❌ Excessive animations
- ❌ “AI-looking” futuristic interfaces
- ❌ Decorative illustrations everywhere
- ❌ Random floating elements
- ❌ Excessive emojis

The product should feel closer to an enterprise security control center than a consumer AI application.

---

## 3. NO FAKE UI RULE
**This is the most important rule.**

NEVER create:
`[Run Scan]` if clicking it does nothing.

NEVER create:
`24 Security Findings` if 24 is hardcoded.

NEVER create:
`Critical: 4 | High: 8 | Medium: 12` unless those values come from the backend.

NEVER create fake:
- repositories
- vulnerabilities
- users
- organizations
- cloud accounts
- Kubernetes clusters
- CI/CD pipelines
- scan results
- security scores
- charts
- attack paths
- compliance results
- logs
- audit events

If backend data does not exist yet, build the empty/loading/error state, not fake data.

---

## 4. Every Button Must Work
Every interactive element must have an implementation.

| UI Element | Required Behavior |
| :--- | :--- |
| **Run Scan** | Start real scan |
| **Stop Scan** | Stop/cancel real scan |
| **View Finding** | Open actual finding |
| **Fix** | Trigger actual remediation workflow |
| **Create Project** | Create project through API |
| **Delete** | Real deletion + confirmation |
| **Connect GitHub** | Real OAuth/integration flow |
| **Export** | Generate actual export |
| **Search** | Search actual dataset |
| **Filter** | Filter actual dataset |
| **Sort** | Sort actual dataset |
| **Pagination** | Load actual next page |
| **Refresh** | Fetch current backend state |
| **Retry** | Retry failed request |
| **Save** | Persist configuration |
| **Invite User** | Send actual invitation |
| **Logout** | Destroy session |
| **Change Workspace** | Change actual workspace |

If functionality isn't implemented yet:
Do not pretend that it is.
Use:
`Coming soon` or disable the feature with a clear explanation.

---

## 5. No Fake Popups
Do not randomly open content in floating popups.

Bad:
```text
Click Finding -> Random side popup -> Everything squeezed inside
```

Instead use proper navigation depending on complexity:
- **Small action:** modal or confirmation dialog
- **Detailed information:** `/findings/123` with a dedicated page
- **Configuration:** `/settings/security`
- **Complex workflow:** dedicated page or structured stepper

---

## 6. Navigation Rules
The sidebar must remain consistent across the application.

Example structure:
```text
THING

Workspace
├── Overview
├── Projects
├── Repositories
├── Findings
├── Scans
├── Policies
├── Integrations
└── Audit Logs

Security
├── Security Overview
├── Attack Surface
├── Cloud
├── Kubernetes
├── CI/CD
└── Compliance

Administration
├── Members
├── Roles
├── API Keys
├── SSO
├── Billing
└── Settings
```

### Rules:
- Active route must be visually obvious.
- Sidebar should not randomly change between pages.
- Don't hide important navigation behind unnecessary menus.
- Breadcrumbs should be used on deep pages.
- User should always know where they are.

---

## 7. Dashboard Rules
Do not fill dashboards with random cards.
Every dashboard component must answer a real question.

For example:
- **Security Overview:** Security Score, Critical Findings, Open Findings, Repositories, Cloud Resources, Kubernetes Clusters, Active Scans.
- **Then:** Risk Trend, Critical Findings, Recent Security Activity, Top Risk Areas.
- Each component must correspond to actual backend information.

---

## 8. Data Loading States
Every data-driven component must have:
- **Loading:** `Loading findings...`
- **Empty:** `No security findings. Your environment currently has no findings.`
- **Error:** `Unable to load findings. [Try again]`
- **Success:** Actual data.
- **Partial failure:** If one dashboard widget fails, don't destroy the entire dashboard.

---

## 9. Tables
Security products rely heavily on tables.
Tables should support:
- Search
- Filters
- Sorting
- Pagination
- Column visibility where useful
- Row selection
- Bulk actions where appropriate
- Loading state
- Empty state
- Error state

Example:
```text
Security Findings
[Search findings................] [Filter] [Severity]

Severity | Finding | Repository | Status | Detected | Actions
--------------------------------------------------------------
Critical | SQLi    | payments   | Open   | 2h ago   | View
High     | Secret  | backend    | Open   | 4h ago   | View
```
Do not create tables with decorative fake records.

---

## 10. Forms
Every form must have:
- Label
- Input
- Validation
- Error message
- Loading state
- Success state
- API integration
- Disabled state while submitting

Example:
```text
Repository Name
[________________]

Repository URL
[________________]

[ Connect Repository ]

After submission:
Connecting...
Then: ✓ Repository connected
Or: Unable to connect repository (GitHub returned: Permission denied)
```

---

## 11. Security Severity System
Use a consistent severity language throughout the product:
- **Critical**
- **High**
- **Medium**
- **Low**
- **Informational**

Do not randomly change terminology between screens (e.g., don't use Danger, Critical, Severe, Urgent interchangeably). Severity indicators and color badges must remain consistent everywhere.

---

## 12. Charts
Charts must represent actual backend data.
Before creating a chart ask: **What API provides this data?**
If there is no API: **Do not invent the chart.**
Charts should also have:
- Time range selection (`[7D] [30D] [90D] [1Y]`)
- Tooltip
- Empty state
- Loading state
- Error state
- Appropriate units

---

## 13. No Hardcoded Production Data
Antigravity must never do:
```typescript
const findings = 24;
const critical = 4;
const repositories = 12;
```
for production UI.

Instead:
```typescript
const { data } = await api.get("/findings");
```
Then calculate values from the response.
The same applies to:
- Dashboard counts
- User names
- Organization names
- Repository names
- Security scores
- Scan status
- Cloud resources
- Compliance scores

---

## 14. API-First UI Rule
Before implementing a screen:
1. **Step 1:** Identify required backend API.
2. **Step 2:** Identify response schema.
3. **Step 3:** Build UI based on actual response.
4. **Step 4:** Implement loading/error/empty states.
5. **Step 5:** Connect actions to APIs.
6. **Step 6:** Test the complete workflow.

Never design a fake frontend first and assume the backend will be connected later.

---

## 15. Responsive Design
The application must work on:
- Desktop: Sidebar + Content
- Laptop: Optimized layout
- Tablet: Collapsed Sidebar + Content

Don't simply shrink desktop UI until everything becomes unreadable.

---

## 16. Typography
Use a professional font system:
- **Page Title:** 24–32px
- **Section Heading:** 18–22px
- **Card Heading:** 14–16px
- **Body:** 13–15px
- **Metadata:** 12–13px

Don't use huge typography for normal dashboard pages.

---

## 17. Spacing
Use a consistent spacing system:
`4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
Don't randomly use arbitrary odd numbers (`17px`, `23px`, `37px`, `51px`) unless technically necessary.

---

## 18. Cards
Cards should exist only when they provide useful grouping.
Avoid repeating empty/metric cards 15 times just to make the dashboard look full.
Use information density appropriate for security operations.

---

## 19. Notifications
Use notifications for actual events:
- `✓ Repository connected`
- `! Scan failed`
- `! GitHub authorization expired`
- `✓ Finding marked as resolved`

Don't generate notifications just for visual effect.

---

## 20. Confirmation Rules
Dangerous actions require confirmation:
- Delete Repository
- Delete Project
- Remove Member
- Disconnect GitHub
- Delete API Key
- Disable Security Policy

Confirmation dialogs must clearly explain consequences:
```text
Delete Repository?
This will remove the repository connection and associated scan configuration.
This action cannot be undone.
[Cancel] [Delete Repository]
```

---

## 21. Permission-Aware UI
If a user doesn't have permission:
Don't show an active button that will fail later.
The button should either not appear or appear disabled with an explanation.
Frontend permissions must match backend authorization.
Never rely only on frontend hiding for security.

---

## 22. Authentication UX
Authentication must feel like one coherent system.
Pages:
- Sign In
- Sign Up
- Forgot Password
- Reset Password
- Email Verification
- MFA Setup
- MFA Verification
- SSO
- Session Expired
- Unauthorized

After login flow:
`Authentication -> Organization -> Workspace -> Application`

Never allow users to access protected routes without proper authentication and authorization.

---

## 23. Onboarding
Onboarding should be an actual workflow:
`Welcome -> Create Organization -> Create Project -> Environment Setup -> Connect Repository -> Connect Cloud -> Connect Kubernetes -> Connect CI/CD -> Security Preferences -> Invite Team -> Complete`

Every step must save actual data. Progress must persist if the user leaves and returns.

---

## 24. No Unnecessary Animation
Animations should communicate state:
- `Scanning...` [progress]
- `Saving...`

Avoid:
- Cards flying into the screen
- Excessive hover effects
- Constant glowing
- Animated gradients
- Random particles
- Decorative 3D objects

Security software should feel stable and trustworthy.

---

## 25. Accessibility
Every page should have:
- Keyboard navigation
- Visible focus states
- Proper labels
- Accessible buttons
- Readable contrast
- Error messages associated with inputs
- Tooltips for unfamiliar icons
- No icon-only critical actions without accessible labels

---

## 26. Icons
Use one consistent icon library (`lucide-react`).
Don't mix icon libraries or use emoji decoratively. Icons should support the UI, not become the UI.

---

## 27. URL & State Rules
Pages should have meaningful routes:
- `/code`
- `/code/repositories`
- `/code/repositories/123`
- `/code/findings`
- `/code/findings/456`
- `/code/scans`
- `/code/scans/789`

Important filters must be represented in URL query parameters so users can share or bookmark them.

---

## 28. Preserve User State
When navigating back:
- Search queries should remain.
- Filters should remain.
- Pagination should behave predictably.
- Selected workspace should remain.
- Tabs should remain where appropriate.

Don't unexpectedly reset the entire interface after every API call.

---

## 29. Performance
UI should not unnecessarily:
- Reload the whole page
- Refetch everything
- Re-render every component
- Load huge datasets at once

Use pagination, lazy loading, caching, incremental fetching, debounced search, and optimistic updates where safe.

---

## 30. Final Antigravity Rule
Give this rule the highest priority:

> **Do not optimize for making the screen look complete. Optimize for making the product function correctly.**

Before considering a page complete, verify:
- [x] Real backend data
- [x] Real API integration
- [x] Real buttons
- [x] Real forms
- [x] Real navigation
- [x] Real authentication
- [x] Real authorization
- [x] Loading state
- [x] Empty state
- [x] Error state
- [x] Success state
- [x] Validation
- [x] Responsive layout
- [x] Accessibility
- [x] No hardcoded production data
- [x] No fake charts
- [x] No fake notifications
- [x] No fake workflows
- [x] No decorative functionality
