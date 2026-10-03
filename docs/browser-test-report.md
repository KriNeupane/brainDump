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

## Streaming AI update
Every authenticated message now reserves an AI attempt, including greetings, clarification and out-of-scope refusal. The model receives the last two bounded chat messages and instructions for brief, natural memory-assistant conversation. Browser requests opt into real SSE token streaming; replies are rendered incrementally, preserve scroll position when reading earlier messages, and display stream/storage failures without claiming completion. Guest mode remains local. Automated suite: 44 passing tests, including ordered deltas, hidden reasoning, failed persistence, and AI quota use for greetings. The earlier free guidance/scope-refusal behavior is superseded for authenticated chat.

## Session persistence and stale-tab incident
Sessions now use Secure, HttpOnly, same-origin cookies with server-side refresh. Live login, reload restoration, guest menu, and logout were verified. Auth controls stay hidden during restoration, avoiding a guest login-panel flash. The logout test cleared the shared browser session while another open tab retained a stale signed-in profile; that tab then displayed “Sign in to continue,” rather than crashing. Logout now uses Supabase local scope, broadcasts logout to other tabs, and clears stale account state when refresh finds no session. Cross-tab handling was reviewed in code; no further live logout was performed to avoid interrupting the user. The user’s account and history were restored, reload persistence was verified again, and their unsent draft was restored without submission. Suite: 50 passing tests. Physical-device and multi-account verification gaps above remain.

## Real link-dump and later recall test
Saved the user-provided UT CDSO application page, Georgia Tech fellowship page, and Guardian article through the signed-in browser composer. Georgia Tech reused the existing saved article; the other two created saved articles with extracted content. Verified all three in Memories after reload. Asked exactly: “hey i gave u somthing about UT applcation, can you find when was the deadline to apply to that masters program?” The AI answered April 15 for fall and September 1 for spring, matching the official UT page. Initially the answer exposed two irrelevant source buttons. Retrieval now uses word matches, title weighting, and UT Austin domain/name recognition; the live retest returned only the UT citation. Added a regression for this mixed library and misspelled question. Suite: 51 passing tests.

The user’s screenshot also showed an invented current time. The model has no live clock/timezone. Prompt instructions now make that limitation explicit, and direct current-time requests retrieve no memories. The first live retest stopped inventing clock time but substituted an irrelevant saved date; this prompted the stricter no-source handling and instruction against substituting capture dates.

Final live time retest replied: “I don’t have access to live time or clocks. Let me know how I can help with your memories!” with no source buttons or invented date.

## Chat motion, library actions, and blocked-article recovery
Incoming SSE text now updates the active reply instead of rebuilding history for every delta. A small animation-frame buffer smooths network bursts, with reduced-motion and background-tab handling. Auto-follow eases to the bottom on send and follows incoming text; wheel/touch/keyboard interaction stops it. Live DOM samples showed scroll positions progressing 5001 → 5156 → 5212 rather than snapping, and reply text progressing 0 → 26 → 50 characters. During an upward-scroll test, the reader’s position remained 4336 while new content arrived and after completion. No browser console errors were observed.

Memories has a minimal full-text search over titles/content/tags, compact previews, and selection controls. Select one, several, or all and confirm Delete. Server bulk deletion uses one owner-filtered hard DELETE, independently of chat history. Browser verified search matches, no-match state, single/multiple/all confirmation and cancellation; no production memory deletion was executed. Tests validate caller scoping, invalid selections, and that chat is untouched.

Source shortcuts now appear only for citations actually present in the answer, retaining original citation numbers. Timer/greeting/history responses no longer expose unrelated retrieved links. Comparison queries retain multiple relevant institutions rather than restricting to UT.

The supplied Washington Post link was tested live. Publisher access was blocked; the link was saved as needing content, with a natural AI explanation and an Add article text action instead of a failed-send error. The focused paste dialog was opened and cancelled. Pasted text updates the existing encrypted article record, then requests a summary without another URL fetch or duplicate. The same-record update is covered by fixture tests; the browser paste-and-summary submission was not executed. No paywalled article text was obtained or pasted in the browser. Suite: 59 passing tests.

Browser proof screenshots are now kept in ignored .artifacts/browser rather than the repository root. Earlier screenshot paths in conversation messages predate that cleanup.
