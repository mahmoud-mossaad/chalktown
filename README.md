# Chalk Town — Living Signal + Negative Presence

This build contains the shared Chalk Town journey and two complete interactive chambers:

1. **The Living Signal** — microphone-reactive living membrane.
2. **Negative Presence** — camera and microphone-driven monochrome directional distortion.

## Run

```bash
npm install
npm run dev
```

Open the local HTTPS/localhost URL shown by Vite. Camera and microphone permissions require a secure context (`localhost` is accepted by browsers).

## Experience lifecycle

Each chamber follows the same manager lifecycle:

1. Chalk Town project panel
2. Centered portal transition
3. Black layout-settlement frame
4. Experience mount
5. Experience-specific cleanup
6. Shared return transition

Press **Escape** or use the in-experience return control to return to Chalk Town.

## Structure

- `src/App.jsx` — Chalk Town journey and shared experience host
- `src/experiences/LivingSignal/` — first experience
- `src/experiences/NegativePresence/` — second experience
- `src/projects.js` — project registry

The remaining project chambers stay prepared as placeholders for their original source code.
