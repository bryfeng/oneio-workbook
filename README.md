# ONE.io Workbook

[Open the workbook](https://bryfeng.github.io/oneio-workbook/)

A discussion workbook for ONE.io’s API inventory, business wallets, Fireblocks Flow and crypto batch payouts.

- [API brief](https://bryfeng.github.io/oneio-workbook/): current inventory, desired functionality, provider capabilities and proposed integration.
- [Visual overview](https://bryfeng.github.io/oneio-workbook/visuals.html): merchant journeys and service responsibilities.
- [System map](https://bryfeng.github.io/oneio-workbook/system.html): shared architecture references, proposed extension points and follow-up items.
- [API walkthrough](https://bryfeng.github.io/oneio-workbook/walkthrough.html): business wallet setup → Fireblocks Flow collection → crypto batch payouts.
- [LLM-ready Markdown](https://bryfeng.github.io/oneio-workbook/one-api-walkthrough.md): worked parameters, response examples and service handoffs for the development team.

## How to read it

The workbook distinguishes documented provider methods from proposed ONE contracts and illustrative internal handoffs. Example identities, payment amounts and outcomes are fictional. The system map reconstructs shared documents and does not establish current deployed service boundaries. Source links retain their original access permissions.

Auto-conversion is on hold. The walkthrough is a static specification aid and does not invoke payment APIs, connect wallets or move funds.

## Edit and build

Requires Node.js 22 or later, with no package dependencies.

```sh
node build.mjs
```

Edit the files in `src/`. The build produces six pages, standalone HTML exports and Markdown handoffs in `dist/`. `src/walkthrough-data.mjs` supplies the shared examples used by both the HTML walkthrough and Markdown handoff.

The `flow.html` page covers white-label Flow delivery options, creation parameters, checkout calls and the proposed timeline. Its reviewed sources are `src/flow-delivery.md` and `src/flow-api.md`; `build-flow.mjs` uses those same files for the HTML page and `one-flow-brief.md` download. The standalone export is `one-flow-delivery.html`.

The collection product specification is `flow-experience.html`, linked from the Flow page. Its canonical source is `src/flow-experience.md`, covering the merchant and payer journey, connected API calls, example parameters, service responsibilities, status model and acceptance criteria. The same source produces `one-flow-experience.md` for the development team and `one-flow-experience.html` for standalone review. The live proof stops at Flow creation and receiving-address verification; later checkout and credit stages remain proposed or documented-but-untested.

The standalone files can be opened without a server. Keep the HTML exports and Markdown download together for their companion links.

## Publishing

The GitHub Actions workflow builds and deploys `dist/` to GitHub Pages after a push to `main`, or when manually dispatched. The repository and Pages site are public.
