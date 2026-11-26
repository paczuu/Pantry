---
description: Add a new API message code (error or notification) end to end
argument-hint: <CODE> "<English text with {params}>" "<Polish text with {params}>"
---

Add a new API message following "API messages" in `AGENTS.md`. Arguments: $ARGUMENTS

1. Add `CODE: 'English text'` to `MESSAGES` in `backend/src/utils/messages.ts` (UPPER_SNAKE_CASE, grouped with related codes).
2. Add `CODE: { en: '…', pl: '…' }` to `API_MESSAGES` in `frontend/src/language/apiMessages.ts` (same placeholders).
3. Use it where needed in a controller: `apiError('CODE', params)` for errors, `apiMessage('CODE', params)` for
   notifications, `auditDetails('CODE', params)` for audit-log details. Spread the result into the JSON body.
4. Run `npx tsc --noEmit` in `backend/` and `frontend/`.

If no Polish text was supplied, write a natural Polish translation yourself and mention it in the summary.
