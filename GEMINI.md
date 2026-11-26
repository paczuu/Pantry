@./AGENTS.md

# Gemini CLI notes

- The full project map, commands, conventions and gotchas are in `AGENTS.md` (imported above). Read it before editing.
- Answer the maintainer in **Polish**; write code, comments, identifiers and commit messages in **English**.
- Before finishing a task run `npx tsc --noEmit` in `frontend/` and/or `backend/` (whichever you changed); there is no
  test suite.
- Do not run destructive commands (`git reset --hard`, deleting `data/`, `prisma db push --force-reset`) and do not
  commit or push unless asked.
- Never print, copy or commit values from `backend/.env`; use `backend/.env.example` as the reference.
