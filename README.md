# BrainDump
Private cloud memory assistant, early beta. Save articles, screenshots, and thoughts; search your collection and ask questions grounded in saved sources.

## Run
Requires Node 22+.

```sh
npm install
npm run dev
```

Signed-out users can save links, screenshots, and text in guest mode, recall matching saved passages, and export their library and chat. Guest data lives only in tab memory, disappears on reload or navigation away, and is not uploaded. Recall uses deterministic matching, not a connected AI model. Sign-in warns users to export guest content before leaving; automatic guest-to-account import is not implemented.

## Cloud setup
1. Create a Supabase project. Run `supabase/schema.sql` and the SQL files under `supabase/migrations/` in its SQL editor.
2. Enable Google under Authentication → Providers; configure Google OAuth credentials and your production callback/redirect URLs. Disable providers you do not need.
3. Copy `.dev.vars.example` to `.dev.vars`. Supply Supabase URL, publishable key, and a 32-byte base64 encryption key (`openssl rand -base64 32`). Never commit `.dev.vars`.
4. In production set secrets with `npx wrangler secret put SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `CONTENT_KEY` individually. Preserve CONTENT_KEY securely; losing it makes existing encrypted records unreadable. Rotation requires migration.
5. Review your inference provider's training, retention, and data processing commitments before enabling `AI_ENABLED=true`. Configure this variable and an available model in `wrangler.jsonc`. Cloudflare Workers AI uses a shared free quota; some models require paid access.
6. Run `npm test`, then `npm run deploy`. Use the workers.dev domain initially; set Supabase redirect URLs to its exact origin.

## Implemented
- Responsive library, keyword recall, capture dialog, screenshot display, source details, deletion, JSON export.
- Google OAuth PKCE with a server-side code exchange. Access and refresh tokens stay in Secure, HttpOnly, SameSite=Lax __Host cookies; only the user profile reaches browser JS. The session restores on reload and rotates expired access tokens using Supabase refresh tokens. The PKCE verifier is temporary session storage.
- Cloudflare Worker API verifies each request against Supabase Auth. Supabase RLS isolates every user's records. No service-role key in the app.
- AES-GCM application encryption for titles, text, screenshot bytes, tags and chat content, bound to owner ID. IDs, ownership and timestamps remain visible in database metadata.
- Memory-grounded cloud chat, explicit save-answer action, encrypted chat history, 20 AI attempts/day and 200 memories/user beta caps.
- CSP, same-origin mutation checks, private caching and generic server error responses; application code does not log user content.

## Important limits before a public launch
This is not E2E encryption. The backend can decrypt records; enabled cloud AI receives selected text. It has not undergone a security audit. The encryption key is app-wide; use a managed key service and per-user envelope encryption before scaling.

Standalone HTTPS links saved through Dump are fetched and stored for later recall. Dump returns only a short acknowledgment; Chat discusses saved sources without automatically capturing new input. The reader checks public DNS addresses and every redirect, enforces a 10-second deadline and 1 MB body cap, and rejects non-text responses. DNS checking does not pin the connection address, so DNS-rebinding resistance still needs a network-enforced egress proxy before unrestricted public launch. Sites that block access need pasted article text. Screenshot images are saved but automatic OCR/vision is not yet wired; provide their text/description. This avoids pretending the assistant understood uncaptured content. Processing queues, stronger network-enforced egress restrictions, and OCR remain follow-ups.

Retrieval currently matches keywords over up to 200 decrypted records, not embeddings. Current web research is not included; the AI must disclose that limitation. The chat displays plain text and source citations, never renders untrusted HTML. The question, the last two chat messages (up to 800 characters each), and up to three 1,500-character saved passages are passed to Cloudflare Workers AI. Explicit followups reuse the previous source IDs; screenshot bytes are excluded. No autonomous tools are exposed.

Free tiers are shared resources, not unlimited capacity. Add race-safe memory/upload quotas, pagination, private blob storage for screenshots, rate limits on non-chat endpoints, backups with tested recovery, abuse controls before opening unrestricted registration. Beta data deletion removes active database rows; provider backups may retain data. Export contains plaintext.

The repository includes `omnimemo-repo-structure.html`, the original planning document, untouched.

## AI safeguards
Cloud AI is enabled for authenticated users. Guest recall remains local and deterministic. Every signed-in chat message now uses the AI model, including greetings and scope clarification. The model is instructed to stay within memory capture, recall and app guidance, decline unrelated work, and treat sources as untrusted evidence. This is not a perfect semantic firewall. All calls reserve quota before inference; replies use real SSE streaming, not a simulated typewriter effect.

A shared SQLite Durable Object atomically reserves at most 50 AI attempts/day across the app, 20/account/day, and 3/account/minute. Daily counters reset at midnight UTC. Failed inference attempts count; no automatic retries. Questions are limited to 1,000 characters and output to 400 model tokens. This bounds usage, not exact neuron consumption; Cloudflare's account-wide free quota can be exhausted earlier by this or other apps. No paid plan is enabled by deployment. Missing budget bindings or budget failures stop inference.

Cloudflare states it does not use Workers AI content for training or improvement without explicit consent: https://developers.cloudflare.com/workers-ai/platform/data-usage/. Cloudflare processes selected plaintext during inference. The app stores chats encrypted and does not add AI Gateway prompt logging. Self-service account deletion uses a caller-bound RPC; actual destructive deletion is not part of browser smoke tests.

Dump saves text, HTTPS links and images through one composer. Image descriptions are optional; OCR remains unavailable. Existing links reuse the saved source. Successful signed-in dumps can use a bounded AI acknowledgment under the same quota; exhausted allowances or provider failures fall back to “Saved.” without undoing storage. Dumps do not create chat history. Guest dumping remains local, with no AI or server fetching.

### Beta limits explained
The 20/account/day and 50/app/day AI limits are application policy, not provider question limits. Chat replies, short AI dump acknowledgments, and failed inference attempts share these counters. Saving remains available after AI runs out; acknowledgments fall back to “Saved.” Daily counters reset at 00:00 UTC, and quota notices display the reset in the browser’s local time. Memory storage is capped at 200 items/account, with 40,000 characters per text item and 3 MB per image. Images currently live in the database as encoded data and have no OCR; this is a beta storage tradeoff, not a scalable upload design.
