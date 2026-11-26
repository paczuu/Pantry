# Pantry — guide for AI coding agents

Self-hosted household pantry PWA: EAN barcode scanner, expiry tracking, shared shopping lists, notes, recipes,
multi-user households with roles, audit log, realtime sync. Full-stack TypeScript, SQLite.

This file is the single source of truth for agents (Claude Code, Gemini CLI, Codex, Cursor, …).
`CLAUDE.md` and `GEMINI.md` import it and only add tool-specific notes.

## Quick facts

| | |
| --- | --- |
| Frontend | React 18, Vite, Tailwind 3.4, `lucide-react`, `html5-qrcode`, `socket.io-client`, `vite-plugin-pwa` |
| Backend | Node 18+, Express 4 (ESM, `.js` import suffixes), Prisma 5 + SQLite, Zod, JWT, `bcryptjs`, Socket.IO |
| Deploy | `docker compose up -d --build` → app on `:3200` (nginx serves frontend and proxies `/api`, `/socket.io`) |
| Languages | UI is bilingual **pl / en**. Code, comments and commit messages are **English**. The maintainer talks to you in Polish. |
| Tests | There is no test suite. Verification = type-check + build + looking at the running app. |

## Commands

```bash
# Backend (http://localhost:3001)
cd backend && npm install && npm run prisma:generate && npm run prisma:push
npm run dev                 # tsx watch src/index.ts
npx tsc --noEmit            # type-check
npm run build               # tsc + prisma generate

# Frontend (http://localhost:5173, proxies /api and /socket.io to :3001)
cd frontend && npm install
npm run dev
npx tsc --noEmit            # type-check (run after every change)
npm run build               # tsc && vite build
```

Always run `npx tsc --noEmit` in the project(s) you touched before reporting a task as done.

## Repository map

```
.
├── AGENTS.md / CLAUDE.md / GEMINI.md   agent instructions (this file + thin wrappers)
├── .claude/                            Claude Code settings, slash commands, subagents
├── docker-compose.yml                  build from source: backend (:3001, internal) + frontend nginx (:3200)
├── docker-compose.ghcr.yml             same stack from the published ghcr.io images (user-facing install)
├── .github/workflows/release.yml       on tag v*: multi-arch images to GHCR + GitHub release
├── data/                               SQLite database used by Docker and by the real dev setup (gitignored)
├── docs/screenshots/                   README images
├── README.md / README-PL.md            user-facing docs (keep both in sync)
├── backend/
│   ├── prisma/schema.prisma            models: User, Household, ProductCatalog, BarcodeSourceSetting,
│   │                                   PantryItem, ShoppingList, ShoppingItem, Note, Recipe,
│   │                                   ActivityLog, CategorySetting
│   └── src/
│       ├── index.ts                    Express app, CORS, JSON limit 10 MB, realtime hook, /api/health
│       ├── routes.ts                   ALL routes + middleware wiring (one file)
│       ├── controllers/                auth, pantry, catalog, shopping, notes, recipes, settings,
│       │                               barcodeSettings, systemAdmin, audit
│       ├── middleware/                 auth (JWT), requireAdmin, requireSystemAdmin
│       ├── services/
│       │   ├── auditService.ts         logActivity()
│       │   ├── realtime.ts             Socket.IO: rooms per household, presence, scope broadcasts
│       │   └── barcode/                lookupProductByBarcode + Open*Facts providers
│       └── utils/
│           ├── messages.ts             API message-code catalog (see "API messages")
│           └── expiryWarning.ts
└── frontend/
    ├── vite.config.ts, tailwind.config.js, nginx.conf
    └── src/
        ├── main.tsx, App.tsx           providers + tab switching (no router; `activeTab` state)
        ├── pages/                      DashboardPage, PantryPage, LoginPage
        ├── components/
        │   ├── ui/                     SHARED primitives — use these first (see "UI conventions")
        │   ├── common/                 Header, BottomNav, Modal, ExpiryBadge, PantryItemThumb,
        │   │                           VoiceDateInput, InstallPwaModal, LiveEditorsBadge
        │   ├── pantry/                 PantryCard, PantrySwipeRow, PantryFilter, EditPantryItemModal
        │   ├── scanner/                BarcodeScannerModal, QuickAddModal, QuickRemoveModal
        │   ├── shopping/ notes/ recipes/ audit/ settings/ auth/   one view per feature
        ├── contexts/                   Auth, Pantry (items + filters + stats), Realtime, Toast
        ├── hooks/                      usePwaInstall, useVisualViewport, useVoiceExpiry
        ├── language/                   translations.ts (UI strings), apiMessages.ts (server codes),
        │                               LanguageContext.tsx
        ├── services/api.ts             the only HTTP client (ApiService singleton, ApiError)
        ├── types/index.ts              shared TS types
        └── utils/                      cn, expiry, navConfig, accentTheme, speechDateParser, …
```

## Domain model in one paragraph

A **Household** owns pantry items, shopping lists, notes, recipes, categories and barcode-source settings.
A **User** belongs to at most one household with role `ADMIN` or `MEMBER`; `isSystemAdmin` marks the instance owner
(the first registered account). New users join with a 6-character invite code valid for 5 minutes. Pantry items have a
`status` (`ACTIVE`, `CONSUMED`, `WASTED`), `quantity` in pieces and optional `expiryDate`/`openedDate`. Every mutation of
interest is recorded in `ActivityLog`.

## Conventions

### Backend
- Controllers are `async (req, res): Promise<void>` with try/catch; scope every query by `req.user!.householdId`.
- Add new endpoints in `routes.ts`, behind `authenticateToken` (plus `requireAdmin` / `requireSystemAdmin` as needed).
- Validate input with Zod or explicit checks; never trust the client for `householdId`.
- **Realtime is automatic**: `index.ts` wraps `res.json`; after any successful non-GET `/api` call,
  `notifyFromRequest` maps the URL prefix to data scopes (`pantry`, `shopping`, `notes`, `recipes`, `settings`,
  `household`) and broadcasts to the household. A new top-level resource needs a line in `scopesFromPath`
  (`services/realtime.ts`) and a matching `useLiveRefresh` in the frontend.
- Write audit entries with `logActivity({ …, details: auditDetails(CODE, params, extra) })`.

### API messages (important)
The backend never sends bare user-facing text. Every error / notification carries a stable code:

```ts
res.status(400).json({ ...apiError('NOTE_TITLE_REQUIRED') });          // {error, code, params?}
res.json({ ...apiMessage('SHOPPING_TRANSFERRED', { count }), item });   // {message, messageCode, messageParams?}
details: auditDetails('AUDIT_PANTRY_CONSUMED_PART', { qty, remaining }) // stored in ActivityLog
```

To add a message: add the code + English template (`{param}` placeholders) to `backend/src/utils/messages.ts`
**and** the `{ en, pl }` pair to `frontend/src/language/apiMessages.ts` (same code). `services/api.ts` translates
`error`/`message` centrally, so components just show `error.message` / `res.message`. Raw `fetch` calls must use
`translateApiMessage` themselves. Never hard-code Polish/English strings in controllers.

### Frontend
- **UI strings** live in `language/translations.ts` (`pl` and `en` objects must have identical keys; `pl` defines the
  `TranslationKeys` type). Use `const { t } = useLanguage()`; params use `{name}` placeholders.
- **HTTP** goes through `services/api.ts` only; add one typed method per endpoint.
- **Shared UI** (`components/ui/`) — do not re-create these with raw Tailwind:
  `Button` (primary/secondary/ghost/danger; sm/md/lg/icon; `collapseLabel` hides text on phones),
  `Input` / `Select` / `Textarea` / `FieldLabel` / `SearchInput`, `PageHeader`, `Panel` / `EmptyState`,
  `SegmentedControl`, `QuantityStepper`, `ModalActions` (header Cancel/Save for `Modal`).
  Compose classes with `cn()` (`clsx` + `tailwind-merge`) — never string-concatenate Tailwind classes.
- Visual language: dark slate surfaces (`bg-slate-950/900/800`), emerald accent (mapped to CSS variables so the user can
  change accent colour), rounded-xl/2xl/3xl, `text-xs` controls. Keep one look across screens.
- **Mobile first.** The primary target is phones (375 px). Touch targets ≥ 36–44 px, inputs are 16 px on coarse pointers
  (prevents iOS zoom), `100dvh` not `100vh`, respect safe-area insets. Check phone width **and** desktop after UI changes.
- Pantry list on phones uses `PantrySwipeRow` (swipe left for actions); `sm:` and up uses cards.
- Realtime: `useLiveRefresh('pantry_shopping_refresh', fn)` etc.; presence via `useEditingPresence`.
- Comments and JSDoc in English; keep them short and explain *why*.

## Gotchas

- **Dev database path.** Prisma resolves a relative SQLite URL against `backend/prisma/`. `.env.example` has
  `file:../data/pantry.db` → `backend/data/pantry.db` (empty, gitignored). The real data lives in the repo-root `data/`;
  to run against it: `DATABASE_URL="file:../../data/pantry.db" npm run dev`. Docker uses `/app/data/pantry.db`.
  Treat the real DB as production data: never reset, seed over, or bulk-edit it without being asked.
- **Camera needs HTTPS** on iPhone/Safari (except `localhost`). Test the scanner behind a TLS proxy or the Docker build.
  The scanner is tuned for iOS (limited formats, centre-strip scan region, no `backdrop-blur` over live video,
  one shared `AudioContext`); keep those choices when editing `BarcodeScannerModal.tsx`.
- Windows host: paths may be CRLF; prefer the editor/Edit tools over ad-hoc `sed` on `.tsx` files.
- `JWT_SECRET` resolves in `backend/src/utils/jwtSecret.ts`: env value, else a random secret persisted as `.jwt_secret` next to an
  absolute-path SQLite file (Docker), else a development default. Import it from there; never re-declare it. Don't commit real secrets.
- Releases: bump `version` in the three `package.json` files (and lock files), merge to `main`, push tag `vX.Y.Z`; the workflow publishes the images.
- Old audit rows may be stored as Polish text (parsed by `formatAuditDetails`) or as English text; new rows carry
  `messageCode`. Keep that legacy path working.
- `frontend/dist`, `backend/dist`, `node_modules`, `data/` are gitignored.

## Working agreements

- Keep changes minimal and focused; reuse existing helpers and shared components before adding new ones.
- Do not commit, push or open PRs unless asked. When asked for a commit message: English, short (subject + 2–3 lines).
- Update `README.md` **and** `README-PL.md` when user-visible behaviour or setup changes.
- If you add a dependency, say why; prefer what is already in `package.json`.
