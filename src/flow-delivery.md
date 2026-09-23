# ONE.io × Fireblocks Flow — delivery options

**Working draft · 22 September 2026**

The SPARK demonstration needs a white-label Flow experience inside ONE, covering payment creation, checkout, progress and receipt. The delivery choice is whether we use ONE’s existing custody accounts first or include business wallets in the initial build.

| Option | Conference experience | Main dependency |
| --- | --- | --- |
| **1 · Existing custody first** | ONE checkout powered by Flow, settling into an existing ONE custody account | Receiving-address mapping and deposit-to-credit integration |
| **2 · Business wallets + Flow** | Business-wallet setup in ONE, followed by the same white-label collection experience | Business identity, wallet provisioning, permissions and recovery |

Both options require ONE’s branding and application integration, with effort estimates dependent on the services already available.

## Common build · White-label Flow inside ONE

**ONE payment request → ONE checkout using Flow → destination wallet → receipt in ONE**

1. Extend ONE’s request service, or the proposed payment-intent contract, to create a Flow and store its payment reference.
2. Build wallet connection, payment review, quoting and signing into ONE’s checkout through Dynamic’s SDK or API.
3. Receive verified Flow updates and connect the destination’s receipt evidence to the original request.
4. Show progress and receipts inside ONE, handling rejection, expiry, interrupted sessions and wallet handoff.

The working approach is a ONE-controlled frontend using Flow underneath, with creation credentials kept server-side. Dynamic documents self-hosted checkout and hosted custom domains, but a custom domain alone does not establish the required white-label experience inside ONE. Any provider-hosted shortcut needs its branding and integration controls confirmed before entering the plan. [Checkout options](https://www.dynamic.xyz/docs/flow/payment-links)

The [Flow API outline](2026-09-22-flow-whitelabel-api-outline.md) maps the creation endpoint, parameters and checkout calls to a worked ONE payment example.

## 1 · Existing custody first

**ONE checkout → Flow → existing ONE custody → merchant receipt in ONE**

This delivers the collection experience through ONE while building on its existing custody model.

1. Resolve an eligible custody destination through ONE’s account service, confirming the asset/network and fixing the address for each payment.
2. Connect that destination to the common Flow build and match the settlement transfer to ONE’s existing deposit record.
3. Link the existing credit to the merchant receipt, avoiding duplicate credit and preserving held or pending states.

**ONE dependency:** Receiving-address mapping, access to the inbound deposit/credit process, and integration into its application.

**After SPARK:** Add business-wallet setup beneath accounts or crypto custody, then introduce crypto batch payouts.

ONE documents crypto receiving addresses, but the complete asset/network mapping and deposit-to-credit interface still need verification. [ONE API](https://docs.one.io/)

## 2 · Business wallets + Flow

**ONE business account → wallet setup → ONE checkout → Flow collection into the business wallet**

This brings business-wallet setup into the conference experience, adding ownership and access work to the initial build.

1. Map ONE’s business identity to a Dynamic business account, defining administration, signing and recovery responsibilities.
2. Add wallet creation or linking under accounts or crypto custody, with the initial members, signers and policies.
3. Use the verified wallet address in the common Flow build, displaying payment receipt and wallet balance inside ONE.

**ONE dependency:** Business/account integration, wallet permissions and recovery decisions, plus wallet presentation in its application.

**After SPARK:** Extend team controls and crypto batch payouts, with transfers into ONE custody handled separately.

Business-wallet balances remain distinct from ONE custody or bank balances, even when displayed together. Dynamic describes Business Accounts as early access, so access and the control model need confirmation. [Members and roles](https://www.dynamic.xyz/docs/javascript/reference/business-accounts/members-and-roles) · [Policies](https://www.dynamic.xyz/docs/javascript/reference/business-accounts/policies/overview)

## Delivery sequence

Existing custody first is the narrower route to the required ONE experience, with business wallets following afterward. Bringing wallets forward makes sense if wallet setup itself needs to feature at SPARK.

Start with one approved receiving asset/network, then choose a supported funding route for the demonstration. Current Flow testnets require a swap or bridge, while a direct mainnet transfer remains a separate configuration choice. Both need Flow access, approved destinations and verified settlement evidence before we can demonstrate real payments. [Supported chains](https://www.dynamic.xyz/docs/flow/supported-chains) · [Flow events](https://www.dynamic.xyz/docs/flow/webhooks)

| Target | Outcome |
| --- | --- |
| **2 October** | First real payment proof |
| **16 October** | Service connections required by the selected option |
| **30 October** | Complete, rehearsed ONE experience |
| **2–6 November** | Fixes and rehearsal |

Choose the wallet sequence and confirm ONE’s interfaces before sizing the build and drafting stories. Crypto batch payouts remain later work, stablecoin-to-fiat auto-conversion stays on hold, and production readiness is assessed separately.
