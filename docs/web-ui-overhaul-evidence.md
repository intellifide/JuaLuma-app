# Web UI Overhaul Evidence (WEBUX-001 to WEBUX-018)

Date: 2026-02-27 (America/Chicago)
Scope: Web only (`frontend-app`, `frontend-marketing`), no mobile implementation changes.

## Requirement Coverage

1. Apple-premium core product UI feel
- Implemented tokenized glass/surface shell and typography variables in `frontend-app/src/styles/index.css` (WEB UX baseline block around lines 3212+).
- App shell/sidebar/topbar refined in `frontend-app/src/styles/index.css` and `frontend-app/src/layouts/AppLayout.tsx`.

2. AI surfaces use Google-like productivity style
- AI surface styling and message shell updates in `frontend-app/src/styles/index.css` (`.ai-surface`, `.chat-message-*`).
- Assistant page structure and motion-assisted reveal in `frontend-app/src/pages/AIAssistant.tsx`.

3. Theme label 2x larger
- `.theme-label` uses `font-size: calc(var(--font-size-xs) * 2)` in `frontend-app/src/styles/index.css`.

4. Dark mode sun icon bright yellow
- `--theme-toggle-sun-color: #ffd60a` and dark theme application for `.theme-toggle-sun` in `frontend-app/src/styles/index.css`.
- Sun icon class applied in `frontend-app/src/components/ThemeToggle.tsx`.

5. Uploaded files move into sent bubble and clear from composer after send
- User message includes `attachments: sentAttachments` and composer is cleared with `setComposerAttachments([])` in `frontend-app/src/pages/AIAssistant.tsx`.
- Sent bubble attachment rendering in `frontend-app/src/components/ChatMessage.tsx`.
- Composer attachment rendering/removal in `frontend-app/src/components/ChatInput.tsx`.

6. Send icon color rule
- Light theme send icon color white via `--send-icon-color: #ffffff`.
- Dark theme send icon color black via `--send-icon-color: #000000`.
- Applied in send button style in `frontend-app/src/components/ChatInput.tsx`.

7. Auto-focus AI input on page open
- `autoFocus` prop passed from `frontend-app/src/pages/AIAssistant.tsx`.
- Focus effect implemented in `frontend-app/src/components/ChatInput.tsx`.

8. Motion.dev/framer-motion usage for UX and promo visuals
- Product app motion in `frontend-app/src/pages/AIAssistant.tsx` and `frontend-app/src/layouts/AppLayout.tsx`.
- Marketing motion implementation via `frontend-marketing/src/lib/motion.tsx` and `frontend-marketing/src/app/page.tsx`.
- Usage map documented in `docs/web-ui-motion-usage-map.md`.

## Code Connect Constraint and Replacement
- Code Connect task remains blocked (`WEBUX-014`).
- Replacement docs:
  - `docs/web-ui-figma-contract.md`
  - `docs/web-ui-figma-manual-sync.md`

## Validation Evidence

### Lint
- `frontend-app`: pass with pre-existing warnings (no errors).
- `frontend-marketing`: pass with no warnings/errors.

### Tests
- `frontend-app`: 18 files, 68 tests passed.
- `frontend-marketing`: 1 file, 1 test passed.

### Builds
- `frontend-app`: build passed (`vite build`).
- `frontend-marketing`: build passed (`next build`).

## Remaining Blocker (Hosted Runtime QA)
- WEBUX-017 requires backend-dependent flow verification against hosted GCP runtime.
- Current environment receives forbidden/not-found responses on known URLs:
  - `https://jualuma-user-app-stage-ripznron4a-uc.a.run.app/` -> 403
  - `https://frontend-app-77ybfmw7cq-uc.a.run.app/` -> 403
  - `https://marketing-site-77ybfmw7cq-uc.a.run.app/` -> 403
  - `https://jualuma-marketing-298159098975.us-central1.run.app/` -> 404

Until a reachable hosted URL (and auth path if required) is provided, WEBUX-017 cannot be closed from this environment.
