# Web Overhaul Figma Contract (WEBUX-002)

## Scope
- Applies only to web surfaces in `frontend-app` and `frontend-marketing`.
- Mobile implementation is explicitly out of scope for this track.

## File Structure
- Figma file name: `JuaLuma Web UX Overhaul Baseline`.
- Pages (ordered):
1. `00 Foundations`
2. `01 Core Shell`
3. `02 AI Surfaces`
4. `03 Marketing & Promo`
5. `90 Experiments`

## Frame Naming
- Use this format: `[Area]/[Page]/[Variant]/[State]`.
- Examples:
1. `Core/Dashboard/Default/Light`
2. `Core/Dashboard/Default/Dark`
3. `AI/Assistant/Conversation/Light`
4. `AI/Assistant/Conversation/Dark`
5. `Marketing/Home/Hero/Light`

## Component Naming
- Use this format: `Web/[Domain]/[Component]/[Variant]`.
- Examples:
1. `Web/Core/Sidebar/NavItem`
2. `Web/Core/ThemeToggle/Default`
3. `Web/AI/ChatInput/Composer`
4. `Web/AI/ChatMessage/User`
5. `Web/AI/ChatMessage/Assistant`
6. `Web/Marketing/Hero/MetricCard`

## Token Naming
- Colors: `color/{surface|text|border|accent}/{role}`.
- Type: `type/{family|size|weight}/{role}`.
- Spacing: `space/{xs|sm|md|lg|xl|2xl}`.
- Radius: `radius/{sm|md|lg|xl|pill}`.
- Shadows: `shadow/{sm|md|lg|glass}`.

## Theme Rules
- Core product UI: Apple-premium visual language.
- AI surfaces: Google-like productivity clarity.
- Shared tokens are mandatory; no one-off component colors.
- Theme label visual size target: 2x prior baseline.
- Dark mode theme-toggle sun target color: bright yellow.

## Manual Mapping Contract (Code Connect Replacement)
- Code Connect is unavailable on current Figma plan, so mapping is maintained manually.
- Required mapping shape:
1. Figma node ID -> code component/file path
2. Node screenshot evidence -> implementation commit/test evidence
3. Mapping updates recorded in `docs/web-ui-figma-manual-sync.md`
- Primary target components:
1. `ThemeToggle` -> `frontend-app/src/components/ThemeToggle.tsx`
2. `ChatInput` -> `frontend-app/src/components/ChatInput.tsx`
3. `ChatMessage` -> `frontend-app/src/components/ChatMessage.tsx`
4. `AppLayout` -> `frontend-app/src/layouts/AppLayout.tsx`
5. `MarketingHero` -> `frontend-marketing/src/app/page.tsx`

## MCP Execution Constraint
- Figma MCP OAuth is active and design file access works (`fileKey: 82xjOMk2VzXWjThZN5UT8W`).
- Code Connect write operations are blocked by plan/seat limits.
- Figma MCP response for `add_code_connect_map`: `You need a Developer seat in an Organization or Enterprise plan to access Code Connect.`
