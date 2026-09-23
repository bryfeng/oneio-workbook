# ONE Gateway V3 — Flow inside ONE

**Product direction · Mark and Bryan aligned · 23 September 2026**

The SPARK demonstration puts Flow inside ONE’s branded checkout and resolves each payment to the merchant’s configured default receiving destination. It builds on the settlement choices ONE already has, while the full Gateway V3 and its Treasury Management Service extension remain a separate, longer-term story.

| Delivery stage | What it delivers | Main dependency |
| --- | --- | --- |
| **1 · Flow-first SPARK demo** | ONE-branded crypto checkout using an eligible custody or verified self-custody destination | Destination resolution, Flow execution and receipt evidence |
| **2 · Full Gateway V3 + TMS** | Shared account and wallet services that support checkout, payouts and later treasury workflows | Business wallet ownership, policies, compliance and treasury operations |

## Common build · White-label Flow inside ONE

**ONE payment request → merchant default destination → Flow → ONE checkout → verified receipt**

1. Extend ONE’s request service, or the proposed payment-intent contract, to load the merchant’s default settlement profile and store the resolved destination with the payment attempt.
2. Create Flow server-side with the fixed payment terms, supported settlement configuration and verified custody or self-custody address.
3. Read Flow back and compare its immutable destination with ONE’s saved attempt before returning the checkout reference.
4. Keep wallet connection, quote review, signing and progress inside ONE’s checkout, then reconcile provider settlement to the correct custody credit or external-wallet receipt.

The working approach is a ONE-controlled frontend using Flow underneath, with creation credentials kept server-side. Dynamic documents self-hosted checkout and hosted custom domains, but a custom domain alone does not establish the required white-label experience inside ONE. [Checkout options](https://www.dynamic.xyz/docs/flow/payment-links)

## 1 · Flow-first SPARK demo

**Gateway V3 or crypto checkout → merchant default → Flow payment → ONE checkout → receipt**

V2 can settle to a manual self-custody wallet or a ONE crypto-custody wallet, but still needs manual trading out. The SPARK demo adds a white-label Fireblocks Flow checkout while keeping those existing destinations.

For a proposed POST /gateway/v3/payment-intents, ONE identifies the merchant from authentication and resolves its eligible default profile. Any profile override must belong to that merchant and pass status, asset and network checks; it resolves to one custody accountId or verified self-custody walletId. Gateway V3 and a future crypto-checkout entry point use the same attempt service, and the Flow adapter gets the address from ONE’s records, never from the payer.

Custody receipts reconcile against ONE’s deposit and ledger credit; self-custody receipts remain external-wallet receipts. Before checkout exposes a route, ONE confirms its Travel Rule data, screening, recordkeeping and exception handling. Those requirements may rule out a route, and Flow screening does not replace ONE’s obligations.

The sandbox test proved address handoff from ONE’s account API into Flow and server-side readback. Payer approval, on-chain delivery and ONE credit remain untested. See the [collection product specification](flow-experience.html) for the call sequence.

## 2 · Full Gateway V3 + TMS

The broader platform extends ONE account services with shared merchant, custody and wallet records, then lets Gateway, payouts and treasury tools use those records. Dynamic Business Accounts can add team ownership, signers and wallet policies later; they are not needed to launch Flow against existing approved settlement destinations.

The longer-term Treasury Management Service could add crypto batch payouts, stablecoin card issuance and other treasury workflows. Treat these as separate product opportunities with their own balance, authority, compliance, reconciliation and operating rules. Batch payouts remain later work, and auto-conversion remains on hold.

Dynamic’s platform environment and Flow are required to operate the Flow payment. Dynamic embedded wallets are optional for the SPARK demo. Business wallet provisioning and team controls require separate access and ownership decisions.

## Delivery sequence

| Step | Outcome |
| --- | --- |
| Flow foundation | ONE request creates a Flow against one eligible merchant default destination |
| Checkout | Payer connects, clears screening, receives a current quote and approves in their wallet |
| Verified receipt | ONE reconciles Flow settlement to a custody credit or external-wallet receipt |
| Account extension | ONE adds shared business wallets under account services without changing the Flow lifecycle |
| Treasury extension | ONE scopes batch payouts and other TMS workflows as separate product work |

Before production, ONE needs to confirm its custody and self-custody destination records, supported asset/network mapping, deposit-credit interface, and compliance ownership. Dynamic’s sandbox testnet currently requires a supported swap or bridge route; real payment readiness also depends on Flow access, approved destinations and verified settlement evidence. [Supported chains](https://www.dynamic.xyz/docs/flow/supported-chains) · [Flow events](https://www.dynamic.xyz/docs/flow/webhooks)

ONE’s current public API inventory describes 25 operations. The business-account and checkout extensions here are proposed service contracts, while the Flow methods follow the provider’s published API. [ONE API](https://docs.one.io/) · [Flow API](https://www.dynamic.xyz/docs/flow/api)
