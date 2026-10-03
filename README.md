# BrainDump
Private cloud memory assistant, early beta. Save articles, screenshots, and thoughts; search your collection and ask questions grounded in saved sources.

## Run
Requires Node 22+.

```sh
npm install
npm run dev
```

Without secrets, the UI runs a clearly labeled sample preview. Preview data lives only in tab memory, disappears on reload, and uses deterministic matching rather than a connected AI model.

## Cloud setup
1. Create a Supabase project. Run `supabase/schema.sql` in its SQL editor.
2. Enable Google under Authentication → Providers; configure Google OAuth credentials and your production callback/redirect URLs. Disable providers you do not need.
3. Copy `.dev.vars.example` to `.dev.vars`. Supply Supabase URL, publishable key, and a 32-byte base64 encryption key (`openssl rand -base64 32`). Never commit `.dev.vars`.
4. In production set secrets with `npx wrangler secret put SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CONTENT_KEY` individually. Preserve CONTENT_KEY securely; losing it makes existing encrypted records unreadable. Rotation requires migration.
5. Review your inference provider's training, retention, and data processing commitments before enabling `AI_ENABLED=true`. Configure this variable and an available model in `wrangler.jsonc`. Cloudflare Workers AI uses a shared free quota; some models require paid access.
6. Run `npm test`, then `npm run deploy`. Use the workers.dev domain initially; set Supabase redirect URLs to its exact origin.

## Implemented
- Responsive library, filters, full text matching, capture dialog, screenshot display, source details, deletion, JSON export.
- Google OAuth PKCE; tokens held in browser memory, verifier in session storage. Current session ends on reload: sign in again. Persistent secure-cookie sessions are a production follow-up.
- Cloudflare Worker API verifies each request against Supabase Auth. Supabase RLS isolates every user's records. No service-role key in the app.
- AES-GCM application encryption for titles, text, screenshot bytes, tags and chat content, bound to owner ID. IDs, ownership and timestamps remain visible in database metadata.
- Memory-grounded cloud chat, explicit save-answer action, encrypted chat history, 20 questions/day and 200 memories/user beta caps.
- CSP, same-origin mutation checks, private caching and generic server error responses; application code does not log user content.

## Important limits before a public launch
This is not E2E encryption. The backend can decrypt records; enabled cloud AI receives selected text. It has not undergone a security audit. The encryption key is app-wide; use a managed key service and per-user envelope encryption before scaling.

Article links are saved but not fetched automatically. Paste article text to make it searchable. Screenshot images are saved but automatic OCR/vision is not yet wired; provide their text/description. This avoids pretending the assistant understood uncaptured content. Hardened extraction with SSRF protection, bounded redirects, processing queues and OCR are next.

Retrieval currently matches keywords over up to 200 decrypted records, not embeddings. Current web research is not included; the AI must disclose that limitation. The chat displays plain text and source citations, never renders untrusted HTML. Existing chat context is passed to the configured model; no autonomous external tools are exposed.

Free tiers are shared resources, not unlimited capacity. Add global usage protection, race-safe memory/upload quotas, pagination, private blob storage for screenshots, rate limits on non-chat endpoints, backups with tested recovery, account deletion automation, session refresh and abuse controls before opening unrestricted registration. Beta data deletion removes active database rows; provider backups may retain data. Export contains plaintext.

The repository includes `omnimemo-repo-structure.html`, the original planning document, untouched.
