# Web Motion Usage Map (WEBUX-011, WEBUX-012, WEBUX-015)

## Tooling
- Product app (`frontend-app`): `framer-motion`.
- Marketing app (`frontend-marketing`): `motion`/`framer-motion` via `src/lib/motion.tsx`.

## Product UX Motion (Google-like productivity restraint)
- Message reveal:
1. Target: AI conversation messages.
2. Pattern: short y-offset + fade-in.
3. UX intent: preserve reading order while reducing visual jump.

- Prompt suggestion cards:
1. Target: AI empty-state quick actions.
2. Pattern: subtle lift on hover.
3. UX intent: communicate click affordance without distraction.

## Promo/Ad Visual Motion
- Hero metric cards:
1. Target: marketing homepage preview cards.
2. Pattern: gentle hover lift + tiny scale increase.
3. UX intent: premium interactive feel for promotional snapshots.

- Budget meter fill:
1. Target: marketing homepage budget bar.
2. Pattern: width animate from `0%` to target value on in-view.
3. UX intent: communicate progress state in a glanceable ad visual.

## Do-Not-Animate Rules
- Do not animate dense financial tables by default.
- Do not animate every route transition globally.
- Do not animate on each keystroke in input fields.
- Prefer durations between `160ms` and `700ms` depending on context.
- Maintain semantic focus order and keyboard accessibility.
