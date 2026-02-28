# Web Figma Manual Sync Map (WEBUX-014A, WEBUX-014B)

## Scope
- Manual design-to-code synchronization for web overhaul while Code Connect is unavailable.
- Source file: `JuaLuma Web UX Overhaul Baseline` (`fileKey: 82xjOMk2VzXWjThZN5UT8W`).

## Baseline Node Registry
| Figma Node ID | Figma Node Name | Code Target |
| --- | --- | --- |
| `0:5` | `AppLayout` | `frontend-app/src/layouts/AppLayout.tsx` |
| `0:427` | `ThemeToggle` | `frontend-app/src/components/ThemeToggle.tsx` |
| `0:18` | `Dashboard` | `frontend-app/src/pages/Dashboard.tsx` |
| `0:350` | `Sidebar` | `frontend-app/src/layouts/AppLayout.tsx` |
| `0:474` | `QuickAIChat` | `frontend-app/src/components/QuickAIChat.tsx` |

## Node Coverage Gaps
- `ChatInput` and `ChatMessage` are implemented in code but not yet represented as dedicated named nodes in the current Figma baseline.
- When those frames are added, append them to the table above before implementation work starts.

## Manual Sync Workflow
1. Pull node metadata with `mcp__figma__get_metadata` for `0:1` and target node IDs.
2. Capture visual baseline with `mcp__figma__get_screenshot` for each changed node.
3. Pull implementation context with `mcp__figma__get_design_context` for changed nodes.
4. Implement code changes in `frontend-app` / `frontend-marketing`.
5. Validate UI with Playwright MCP.
6. Validate frontend packages (`lint`, `test`, `build`).
7. Update this mapping file and relevant Notion task comments.

## Current Baseline Capture
- Captured at: `2026-02-28`.
- Screenshots captured via MCP:
1. `0:5` (`AppLayout`) full shell baseline.
2. `0:18` (`Dashboard`) dashboard content baseline.
3. `0:427` (`ThemeToggle`) control baseline.

## Runtime Validation Rule
- Local runtime is frontend-only for QA.
- Backend-dependent flows (uploads, digests, quotas, legal accepts) must be validated against hosted GCP environment.
