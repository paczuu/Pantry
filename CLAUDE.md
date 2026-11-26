@AGENTS.md

# Claude Code notes

- The full project map, commands, conventions and gotchas are in `AGENTS.md` (imported above). Read it before editing.
- Answer the maintainer in **Polish**; write code, comments, identifiers and commit messages in **English**.
- Shared slash commands live in `.claude/commands/`: `/check` (type-check + build both projects) and
  `/add-message` (add an API message code end to end). The `ui-reviewer` subagent in `.claude/agents/` reviews UI
  changes for consistency with `components/ui/`.
- Shared permissions are in `.claude/settings.json`; personal overrides go to `.claude/settings.local.json` (gitignored).
- Dev servers may already be running (frontend `:5173`, backend `:3001`). Check before starting another instance, and
  stop only the ones you started.
- For visual verification use the built-in browser at phone width (375 px) and desktop; log in with a **local test
  account** only — never create or modify accounts in the real database unless asked.
- Never commit unless explicitly asked. Offer a short English commit message instead.
