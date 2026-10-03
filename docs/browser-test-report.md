# BrainDump browser audit — October 3, 2026

Tested the deployed app in the visible browser using synthetic guest data. Also checked the latest form-error changes locally. No real account was deleted.

| Flow | Result | Evidence / practical limit |
| --- | --- | --- |
| Save a thought | Pass | GPU checklist saved and opened from the library. |
| Save an article with pasted text | Pass | URL and pasted passage saved; both recalled. |
| Recall a topic | Pass | GPU query returned the matching note and article with timestamps and clickable source links. |
| Unrelated query | Pass | Quantum-mechanics question returned no matching memories. |
| Upload screenshot + description | Pass | PNG selected through file picker, saved, and shown in library. Recall searches its description, not pixels. |
| Oversize screenshot | Pass | File above 3 MB rejected. Found and fixed errors outside the dialog; now shown inline. |
| JSON export | Pass | Downloaded file contained 3 memories and 2 chat messages. Browser automation's download event timed out, but the actual file was present in Downloads. |
| Guest reload | Pass | Reload cleared saved data; recall then reported an empty library. |
| Mobile layout | Pass in browser viewport | At 390 × 844, content width equaled viewport width; composer stayed at bottom, navigation/settings were reachable. Not a physical iOS/Android keyboard test. |
| Guest account controls | Pass | No Delete account button without an account. |
| Google login | Fails pending credential | Google chooser and consent work; token exchange fails because the client secret configured earlier was an incorrect value. User must create a fresh secret; transfer and retest remain pending. |
| Cloud persistence / retrieval | Not verified end to end | Requires working Google login. |
| Account deletion | Backend checks pass; browser final action not tested | Same-origin and auth tests pass. Supabase reports anonymous execute=false, authenticated execute=true, and 3 cascading app tables. No real account deletion performed. |

## Current real-use limitations

- AI is disabled. Guest recall matches words and returns saved text; it does not reason, summarize intelligently, or reliably understand conversational follow-ups.
- Article links are not fetched automatically. Paste article contents yourself. Paywalls, deleted pages, and social media links are not handled.
- No screenshot OCR: descriptions must be entered manually. PNG/JPEG/WebP only, up to 3 MB.
- No live web research or current-news answers; no reels, audio, video, or voice capture.
- No automatic AI categorization or semantic search. Tags are manual; recall can miss paraphrases or return weak keyword matches.
- Guest data is temporary and clears on reload or leaving the page. JSON export exists; import/guest-to-account migration does not.
- Login tokens live in memory. Reload requires signing in again, and automatic session refresh is not implemented. Google OAuth was configured in testing mode, not verified for unrestricted public signup.
- One conversation stream; no separate chat threads, rename/history navigation, or saved-item editing.
- Cloud content encryption is server-controlled, not end-to-end encryption. The backend can decrypt it. Account metadata and timestamps are not encrypted by the app.
- Cloud beta limits: 200 memories, 3 MB screenshots, 20 chat questions/day. Guest recall has no server daily quota.

The app is a usable guest capture/recall prototype, not yet the full cloud AI memory product described at the start.

## AI follow-up (October 3, 2026)
Google OAuth secret was corrected and sign-in succeeded. A synthetic GPU note saved to the authenticated cloud account and was recalled. Cloudflare Qwen3 AI is now enabled with memory scope checks, bounded excerpts/output, and atomic shared Durable Object reservations. Live browser verified a cited GPU summary, refusal of a poem request, and a missing gardening memory response. Scope/missing-source responses skip both inference and AI budget consumption. Automated suite: 18 passing tests, including concurrent quota reservations. Scope filtering is deliberately conservative and remains heuristic. Earlier AI-disabled/login-blocked findings above are historical; extraction/OCR/session-refresh limitations still apply.

## Critical edge-case audit
Automated suite expanded to 31 passing tests. Covers expired tokens, cross-origin mutations, malformed/non-object JSON, oversized/invalid chat input, unsupported uploads, memory-cap boundary, encoded private URLs, owner-bound encryption/tampering, global/daily/burst AI denial, unavailable budget/provider, no automatic inference retries, encrypted chat writes, and newest-history ordering. Found and fixed non-object JSON returning 500, oldest-history truncation, unfinished reasoning exposure, image MIME spoofing, and “Tell me more” being incorrectly rejected.

Visible browser verified malicious HTML is displayed as text (no injected script/image elements), source detail rendering, cancellation of deletion without removing the memory, Escape closing capture, and no horizontal overflow at a mobile viewport. Composer remained within the viewport. Synthetic browser data stayed in guest memory.

Remaining verification gaps: no independent second authenticated account was available for a live RLS isolation test; account deletion was not executed; physical iOS/Android keyboards were not tested. Provider prompt-injection resistance is heuristic, not a proven guarantee. Concurrent memory inserts can exceed the preflight 200-record cap; it needs a database-enforced transactional limit. Successful inference followed by storage failure can consume quota without saving a complete turn. Non-AI endpoints still need abuse-rate limits before unrestricted signup. This audit does not certify public-launch readiness.

## Direct capture update
Signed-in chat now captures a standalone HTTPS article link, extracts bounded text, saves it encrypted, and runs a quota-limited AI summary. Verified the user-provided Georgia Tech fellowship URL live, including the source-detail contents. Longer declarative text and explicit “Remember this:” notes are captured in chat. Questions can match source topics without special memory phrasing. Guest capture stays local and does not run AI. Fast responses omit loading text; cloud loading is delayed and labeled Working. Desktop scrollbar geometry was verified at the viewport edge. Suite: 40 passing tests, including extraction redirects/private DNS, note capture and encrypted chat storage.

Extraction limitations: no connection-address pinning (DNS rebinding needs an egress proxy before public launch), no paywall/login/JavaScript-rendered-page handling, and AI sees bounded excerpts. AI cap/provider failures after capture preserve the saved item and return a clear error. Capture detection is heuristic: short ambiguous text may require “Note:”.
