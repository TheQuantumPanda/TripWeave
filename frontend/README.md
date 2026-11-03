# TripWeave · Frontend

Vite + React 18 + TypeScript + Tailwind CSS + Framer Motion.
This is the maintained UI.

## Develop

```bash
npm install
npm run dev          # http://127.0.0.1:5173
```

Run the FastAPI service in another terminal (`python app.py` from the project root).
Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`, so there is no CORS setup.
Override the target with `VITE_API_TARGET` if the API runs elsewhere.

## Build

```bash
npm run build        # tsc --build && vite build → dist/
npm run typecheck    # types only
npm run preview      # serve the production build
```

FastAPI already serves the built SPA at `/` and its assets at `/assets`. Start it after building;
no mount changes are needed. See the root README for required service credentials.

## Layout

```
src/
├── App.tsx            phase orchestration, scroll focus, health probe
├── index.css          design tokens, solid surfaces and button styles, markdown styles
├── components/        UI sections (one file each)
├── hooks/
│   ├── useTravelPlanner.ts   phase machine + thread persistence
│   └── useTheme.ts           light/dark
└── lib/
    ├── api.ts         typed fetch client
    ├── types.ts       mirrors backend._serialize_result() — keep in sync
    ├── agents.ts      per-agent label, icon, colour
    └── utils.ts
```

## Review workflow

After generating a draft, choose **Approve & generate final** or **Revise & Finalize**.
Revision requires feedback and applies it directly to the final plan; there is no second review
cycle. Both actions retain the existing API payloads and planner state transitions.

## Conventions

- Colours come from CSS custom properties on `:root` / `html.dark`, never hardcoded hex.
  Use `rgb(var(--accent) / 0.14)` so any token works at any opacity.
- `src/lib/types.ts` mirrors the backend response exactly. Update both together.
- Run `npm run typecheck` before committing.
