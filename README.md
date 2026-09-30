# ONE Gateway V3 workbook

[Open the Flow-first product story](https://bryfeng.github.io/oneio-workbook/flow.html)

The product path starts with a white-label Fireblocks Flow checkout inside ONE, using an eligible existing custody account or verified self-custody destination. Shared business wallets and broader Treasury Management Service capabilities follow as separate work.

- [Gateway V3 story](https://bryfeng.github.io/oneio-workbook/flow.html): V2 context, SPARK demo, default destination resolution, API handoff and later platform scope.
- [Collection product specification](https://bryfeng.github.io/oneio-workbook/flow-experience.html): user journey, API examples, states, evidence and acceptance criteria.
- [Current API inventory](https://bryfeng.github.io/oneio-workbook/): documented ONE operations, provider capabilities and proposed extensions.
- [Visual map](https://bryfeng.github.io/oneio-workbook/visuals.html) and [ONE service map](https://bryfeng.github.io/oneio-workbook/system.html): current references and Flow-first service path.
- [Flow Lab](https://bryfeng.github.io/oneio-workbook/flow-lab.html): editable Flow requests, raw responses, and a checkout preview; live sends use the protected hosted quote backend.
- [Later wallet and payout example](https://bryfeng.github.io/oneio-workbook/walkthrough.html): a separate follow-on scenario; it does not make business wallets a prerequisite for Flow.

The workbook distinguishes published provider methods, tested sandbox evidence, proposed ONE contracts and future platform opportunities. The current test confirmed that an address returned by ONE can be stored as Flow’s destination; payer approval, settlement and ONE credit remain untested. Flow requires Dynamic’s platform environment, while Dynamic embedded business wallets are optional for the first checkout. Auto-conversion remains on hold.

## Edit and build

Requires Node.js 22.13 or later. The static build has no runtime dependencies; `npm ci` installs the Worker development and test tools. Edit canonical sources under src/ and run node build.mjs to create public and standalone pages under dist/. The flow-delivery, flow-api and flow-experience Markdown files define the product story, provider calls and collection contract.

GitHub Actions builds and deploys dist/ to the public Pages site after a push to main.


## Shared navigation and Flow Lab

`workbook-shell.mjs` owns the seven page routes and injects the same sticky header into every built page, including standalone HTML copies. Keep page titles, edition notes and download links in their page introductions; do not add another page menu. `src/workbook-shell.css` defines the header height and offsets the section navigation below it. On mobile, all seven routes remain visible in two rows.

Flow Lab is the workbook's canonical request playground, adapted from the earlier neutral `demos/flow-checkout-lab` prototype. Its styling uses the workbook's typography, white surfaces, fine borders and green accents. The old prototype remains a historical standalone source.

Run `npm start` with `DYNAMIC_API_TOKEN` and `DYNAMIC_ENVIRONMENT_ID` supplied through the process environment, then open http://127.0.0.1:4318/flow-lab.html. The port defaults to 4318. Keep credentials out of shared-drive files. The static pages need no runtime packages; install development tools with `npm ci` for Worker tests and deployment. `npm test` builds the workbook and runs the navigation, quote-unit and request-execution checks.

Invoice parameters generate five editable drafts. Applying parameters explicitly replaces those drafts; subsequent JSON edits remain intact when moving between requests. Method, URL, headers and request body are editable. **Send** keeps individual requests open; **Run quote sequence** runs the explicit create → verify → source → quote → cancel collection. The response pane shows the actual sent request (resolved variables and redacted credentials), provider response, HTTP status and duration. Drafts and response history stay in browser memory and reset on navigation or reload.

The local server or hosted Worker holds the API and Flow session tokens. It accepts only the five supported Flow operations in its configured environment and only works with Flows created in the current lab session. It rejects executable payment endpoints, other hosts, foreign Flow IDs and cross-origin requests. JSON bodies may include additional provider fields for exploration; the provider remains responsible for its schema validation. The full collection is checked before creation. No prepared payment, signing, approval or broadcast path exists.

The saved invoice, settlement and destination are checked before source attachment. The comparison allows additive provider defaults (for example `isNative: false`) and treats an omitted optional boolean as false, while still enforcing requested true flags. The white-label checkout and individual sends retain successful quotes, even when the merchant amount differs. Users can reprice or change their source on the same Flow, then close it explicitly. Failed quote requests still attempt cancellation. Leaving the page requests cancellation of an open session; if attachment or cancellation fails, the UI exposes the Flow ID, expiry and unconfirmed cleanup. A timed-out creation can have an unknown outcome; creation is never retried automatically. A browser close or server interruption is not a cancellation guarantee.

The GitHub Pages build calls `https://oneio-workbook-flow-lab.bryfeng.workers.dev` directly for live requests. There is no localhost dependency for the public page. `src/flow-lab-config.mjs` contains only that public endpoint. Cloudflare secrets hold the Dynamic API token and an internal session-signing key. The existing Gateway demo Worker is unchanged.

Anyone with the workbook link can edit and send live quote requests; no access key or login is required. The page automatically obtains a signed, two-hour browser session from `POST /api/session`. This session isolates each visitor's Flows and is kept in this tab's session storage across workbook navigation. An expired session is renewed before the next send. The internal signing key is never supplied by or shown to visitors. Neither the Dynamic key nor the provider's Flow session token reaches the browser; upstream credentials remain redacted in the request/response inspector.

The Worker validates the requesting origin and browser session, applies request-rate and body-size limits, and routes each signed browser session to its own SQLite Durable Object. State is saved after each upstream operation, so individual sends continue after a runtime restart. Concurrent sends are rejected and immediate duplicate request IDs are not executed again. A five-minute idle alarm attempts cleanup for attached sessions and retries until the configured Flow expiry; closed or expired contexts are deleted. No request bodies or credentials are written to Worker logs. A creation interrupted before the provider returns its ID remains an unknown outcome and is never automatically retried.

For backend development, run `npm run worker:check` to bundle and validate or `npm run worker:deploy` to deploy intentionally. `npm test` builds the workbook and Worker and exercises its HTTP/session layer and real local Worker runtime with a mocked provider, including a cold restart between API calls. Worker deployment is separate from the existing Pages workflow; pushing the workbook publishes only `dist/`.

## Interactive white-label checkout

The payer experience appears above the API workspace. Choose an example wallet, connect an injected EVM browser wallet, or enter a payer address. The wallet connection requests only account access; it does not request a signature. Base exposes USDC, EURC and ETH choices; other configured networks/tokens follow the editable request drafts. The checkout calls the same live create, verify, source and quote endpoints through the backend with `keepOpen: true`. It displays actual provider amounts, fees, network and expiry on a review screen. It stops at quote review and never invents a payment-success state.

Changing the token reprices the current Flow. Changing the wallet address reattaches the source using the existing server-held session token; the API may omit that token on subsequent attachments. Editing immutable creation fields closes the prior Flow before creating a new one. Re-quote and source changes remain available while the EURC mismatch is investigated. A cancelled or expired quote can still be viewed as a snapshot and refreshed into a new live session. Closing the page requests cancellation, while the hosted idle alarm remains the fallback after five minutes without an API request.

Local browser verification: Flow `4c16530b-91cc-4c89-9a35-399145d41828` returned live USDC and EURC quotes, then accepted a different synthetic payer address on the same Flow (create 201, verify/source/quote/requote/source/quote 200). The amount notice did not block review or repricing. The 27-test suite covers the retained-quote path, private-token reuse on source changes, failure cleanup, and repricing an open Flow after the Worker runtime restarts.

## EURC observation

A EUR 500 invoice settling to Base EURC is still returning roughly 444 EURC in quote-only tests, even with `pegStablecoins: true`. The invoice check records that shortfall, and the checkout displays it as a non-blocking notice; successful HTTP calls do not establish successful invoice fulfillment. The provider's internal cause is unconfirmed. Top-level `amount` and `currency` express the invoice target; no separate request `toAmount` or `settlementAmount` was found in the reviewed schemas. Direct EURC-to-EURC controls also showed a mismatch, so the result cannot be attributed solely to AMM slippage. Never inflate or relabel the invoice to conceal it.


### Verification · 29 September 2026 (30 September UTC)

- All 18 focused checks passed, including navigation for every canonical and standalone page, exact base-unit comparisons, raw-body passthrough, secret redaction, provider-default handling, endpoint restrictions and cleanup failures. The Pages workflow runs these checks before publishing.
- Browser navigation passed for all seven routes at the normal width and at 390px, with no horizontal page overflow. At 1440px the workbook header remains at the top and section navigation sits below it while scrolling. Mobile shows every workbook link in two rows.
- Invalid JSON is rejected before sending. Form parameters regenerate the collection; subsequent body/header edits survive request and tab changes. The sent-request pane exposes resolved URLs and bodies, cURL reflects edits and copies correctly, and editing after a quote marks the preview stale. No browser errors were reported.
- Full edited collection: Flow `04f7217d-edf0-4a94-b951-4937c62891cc`, create/verify/source/quote/cancel statuses 201/200/200/200/200, returned 505.320002 USDC → 444.770087 EURC. The requested 500 EURC target was rejected and the Flow cancelled.
- Individual sends: Flow `239dfa7a-acee-4a0f-9775-4e6b410f9021`, edited quote slippage `0.006` confirmed in the actual sent body, returned 505.32844 USDC → 444.770114 EURC. The 55.229886 EURC shortfall was rejected; quote automatically triggered a confirmed cancellation.
- The first verification probe exposed an omitted false boolean; after fixing the comparison, that earlier Flow (`aaf10837-b8f0-429e-9779-02ca7536339f`) was explicitly cancelled as well. No payment was prepared or submitted in any run.
- Local HTTP checks returned 403 for a foreign origin, 404 for server source, and 400 for malformed JSON or an external upstream URL.
- Review screenshots: `screenshots/flow-lab-desktop.jpg`, `screenshots/flow-lab-mobile.jpg`, `screenshots/shared-header-desktop.jpg` (local review files, excluded from publication).


### Hosted lab deployment · 29 September 2026 (30 September UTC)

Live API sending is provided by the Cloudflare backend from the GitHub Pages workbook. At the owner’s request, the lab-key gate has been removed: visitors connect automatically and can edit and send requests, including individual API steps. The retired `LAB_ACCESS_KEY` secret is removed from the Worker. Public session issuance is rate limited, and each visitor still receives isolated server state. Mainnet quote-only restrictions and the unresolved EURC invoice check remain in force.

The 24-check suite covers the original navigation/amount checks plus automatic public sessions, tampered or expired sessions, allowed origins, rate/body limits, and continuing a Flow after the Worker runtime restarts. The latter test caught and fixed a runtime difference in redirect handling; upstream redirects are rejected without forwarding credentials to another location. The development tool dependencies have no reported audit vulnerabilities at deployment.

Production backend smoke: Flow `64bacd8e-1f31-4f50-a645-4b520389af39` completed create/verify/source/quote/cancel with 201/200/200/200/200 through the deployed Worker. The edited `0.006` slippage request returned 505.477003 USDC → 444.744299 EURC; the 55.255701 EURC shortfall was rejected and cancellation confirmed. The initial connection checks verified session access, 401 without a session, 403 for a foreign origin and 400 for an unsupported request. The updated checks also verify that a fresh visitor obtains a session without a key, that sessions have distinct IDs, and that one visitor cannot continue another visitor’s Flow.
