---
description: Type-check and build the frontend and backend, then report problems
---

Verify the project builds cleanly.

1. In `frontend/` run `npx tsc --noEmit`, then `npm run build`.
2. In `backend/` run `npx tsc --noEmit`.
3. Report each step as OK or failed. For failures quote the first errors with `file:line` and fix them if the cause is
   in code changed during this session; otherwise just report them.

Do not start dev servers and do not commit. $ARGUMENTS
