# Collect a payment through ONE

**Product specification draft · Existing custody first · 23 September 2026**

The merchant creates a payment request in ONE, and the customer pays through ONE’s checkout using their own wallet. ONE supplies the receiving address from its account records, while Flow handles the payment route and reports settlement progress.

## The experience

**Create request → Resolve receiving account → Create Flow → Connect payer → Review and pay → Track receipt**

| Moment | What the user sees | What happens behind it |
| --- | --- | --- |
| Merchant creates a request | Amount, order reference and an enabled receiving account | ONE fixes the payment terms and resolves the receiving address |
| Customer opens checkout | ONE branding, requested amount and a connect-wallet action | ONE starts or resumes a Flow attempt, without requiring a payer address |
| Customer connects a wallet | Available funding network and token | Checkout attaches the connected wallet to Flow and waits for its risk decision |
| Customer reviews payment | Amount to send, route, fees and quote expiry | Flow quotes the selected funding asset against the fixed receiving terms |
| Customer approves payment | Wallet approval, followed by payment progress | The wallet submits the transaction; checkout reports its hash to Flow |
| Merchant receives an update | Payment submitted, funds delivered, then account credited when confirmed | ONE tracks Flow settlement separately from its custody deposit and ledger credit |

The payer stays inside ONE’s experience, apart from the normal approval interaction with their connected wallet. Existing custody accounts provide the first receiving destination; business wallets can later use the same Flow sequence through ONE’s account and wallet services.

## Scope and evidence

| Item | Position in this specification |
| --- | --- |
| ONE login and crypto-account lookup | Existing API; successful authenticated reads during the local test |
| Flow creation and destination readback | Tested locally: creation returned 201, server read returned 200, and the receiving address matched |
| ONE payment intents, attempts and settlement profiles | Proposed product contracts, extending the workbook’s existing walkthrough |
| Payer connection, quote, payment and settlement | Documented provider sequence; not exercised in this test |
| ONE custody deposit and account credit | Integration still to confirm with ONE; no credit demonstrated |
| Auto-conversion and crypto batch payouts | Outside this collection experience; auto-conversion remains on hold |

The Flow test reused a successful ONE account response captured earlier in the session because the fresh Keychain lookup timed out. It proves that the API-returned address can become Flow’s stored destination, while leaving a fresh uninterrupted run and actual settlement untested.

## Example carried through the calls

This worked trace uses the tested receiving configuration, with fictional identifiers and placeholders replacing private account details. The proposed checkout continuation uses test USDC from Arbitrum Sepolia into Base Sepolia, subject to a successful live quote.

| Value | Example | Origin and use |
| --- | --- | --- |
| Merchant and order | `DEMO-MERCHANT-001` / `DEMO-ORDER-1042` | Merchant from ONE authentication; order from the merchant request |
| Existing account | `DEMO-ACCOUNT-001` | `id` from ONE’s account response |
| Receiving address | `<ONE_EVM_RECEIVING_ADDRESS>` | `cryptoAddresses[].primaryAddress`, copied into Flow’s destination |
| Settlement profile | `DEMO-PROFILE-001` | Proposed ONE configuration linking the account to an approved receiving asset and network |
| Intent and attempt | `DEMO-INTENT-1042` / `DEMO-ATTEMPT-1042` | ONE records linking the order to one provider execution attempt |
| Provider Flow | `<FLOW_ID>` | `flow.id` returned by Dynamic; reused in every later provider path |
| Amount | `1.00 USD` | Receiver amount fixed at creation, with `pegStablecoins: true` for this test |
| Receiving asset | Test USDC / Base Sepolia / `84532` | Server configuration; contract `0x036CbD53842c5426634e7929541eC2318f3dCF7e`, six decimals |
| Proposed funding asset | Test USDC / Arbitrum Sepolia / `421614` | Selected after wallet connection; contract `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Payer | `<CONNECTED_PAYER_ADDRESS>` | Connected wallet address, introduced only after Flow creation |

ONE labelled the test account USDT, while this proof used its EVM address for Base Sepolia test USDC. That address reuse does not establish custody support or credit eligibility; production must validate the account, asset and network together.

Current Flow testnet documentation requires a connected wallet and a swap or bridge, so this example sends `disableSwaps: false`. The proposed cross-chain funding route remains untested, and checkout must show the actual quote rather than assuming fees or delivery amounts. [Supported testnet routes](https://www.dynamic.xyz/docs/flow/supported-chains)

## 1. Resolve the receiving account

**Actor: ONE backend → ONE account API · Existing contract**

The merchant selects an existing receiving account, and ONE resolves its address without requiring a dashboard lookup or pasted wallet address. The integration authenticates on behalf of the authorised merchant; the payer never receives these credentials.

```http
POST https://integration-api.uk-sbx-1.credis.tech/api/v1/auth/token
Content-Type: application/json
```

```json
{
  "email": "<ONE_API_EMAIL>",
  "password": "<ONE_API_PASSWORD>"
}
```

```json
{ "accessToken": "<ONE_BEARER_TOKEN>" }
```

```http
GET https://integration-api.uk-sbx-1.credis.tech/api/v1/accounts?accountType=Crypto
Authorization: Bearer <ONE_BEARER_TOKEN>
X-Partner-Authorization: <ENCRYPTED_USER_CONTEXT>
```

**Response excerpt, with illustrative values**

```json
[
  {
    "id": "DEMO-ACCOUNT-001",
    "type": "crypto",
    "status": "active",
    "currency": { "alpha3Code": "USDT" },
    "cryptoAddresses": [
      { "primaryAddress": "<ONE_EVM_RECEIVING_ADDRESS>" }
    ]
  }
]
```

Carry the account ID and selected address into the receiving configuration, retaining the merchant ownership check alongside them. The local proof selected the unique active USDT account with an EVM address; the product must instead resolve the selected account against an approved asset/network mapping.

The partner header encrypts the configured user’s `user_id`, `email`, `created_date`, `first_name` and `last_name`. Our successful calls used AES-256-GCM and Base64 encoding of nonce, ciphertext and tag, matching ONE’s code sample; its prose names AES-GCM-SIV, so production documentation needs clarification. [ONE authentication and accounts](https://docs.one.io/)

## 2. Create the ONE request and attempt

**Actor: merchant → ONE Gateway; checkout → ONE Gateway · Proposed contracts**

The merchant supplies the commercial terms, while ONE derives merchant identity and the receiving destination from authorised records. Extend the proposed settlement profile with `accountId` for existing custody, keeping `walletId` for the later business-wallet path and requiring exactly one receiving resource.

```http
POST /gateway/v3/payment-intents
Authorization: Bearer <ONE_MERCHANT_SESSION>
Idempotency-Key: request-1042
```

```json
{
  "amount": "1.00",
  "currency": "USD",
  "merchantReference": "DEMO-ORDER-1042",
  "settlementProfileId": "DEMO-PROFILE-001",
  "expiresInSeconds": 900
}
```

```json
{
  "id": "DEMO-INTENT-1042",
  "status": "requires_payment",
  "checkoutUrl": "https://checkout.example.invalid/pay/DEMO-INTENT-1042"
}
```

On checkout load, ONE starts or resumes an attempt using access limited to this payment request.

```http
POST /gateway/v3/payment-intents/DEMO-INTENT-1042/attempts
Authorization: Bearer <INTENT_SCOPED_CHECKOUT_TOKEN>
Idempotency-Key: attempt-1042
Content-Type: application/json

{}
```

The attempt handler performs the provider creation and verification in step three before returning this proposed response.

```json
{
  "id": "DEMO-ATTEMPT-1042",
  "intentId": "DEMO-INTENT-1042",
  "provider": "dynamic_flow",
  "providerFlowId": "<FLOW_ID>",
  "status": "initiated"
}
```

Neither request includes a payer address, because the customer has not connected their wallet yet. Account and wallet ownership remain under ONE’s account services; Gateway owns the collection request and its attempts.

## 3. Create Flow and verify its destination

**Actor: ONE Flow adapter → Dynamic server API · Documented contract; address handoff tested**

ONE creates an attempt record before calling Dynamic, then saves the returned Flow ID immediately against that attempt. The adapter resolves the address from step one and the receiving asset from server configuration, rather than accepting either from payer input.

```http
POST https://app.dynamicauth.com/api/v0/server/<ENVIRONMENT_ID>/flow/payment
Authorization: Bearer <DYNAMIC_SERVER_TOKEN>
Content-Type: application/json
```

```json
{
  "amount": "1.00",
  "currency": "USD",
  "expiresIn": 900,
  "pegStablecoins": true,
  "disableSwaps": false,
  "settlementConfig": {
    "strategy": "cheapest",
    "settlements": [{
      "chainName": "EVM",
      "chainId": "84532",
      "tokenAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "symbol": "USDC",
      "tokenDecimals": 6
    }]
  },
  "destinationConfig": {
    "destinations": [{
      "chainName": "EVM",
      "type": "address",
      "identifier": "<ONE_EVM_RECEIVING_ADDRESS>"
    }]
  },
  "memo": {
    "orderId": "DEMO-ORDER-1042",
    "oneAccountId": "DEMO-ACCOUNT-001",
    "oneIntentId": "DEMO-INTENT-1042",
    "oneAttemptId": "DEMO-ATTEMPT-1042"
  }
}
```

**HTTP 201 response excerpt, with illustrative identifiers**

```json
{
  "flow": {
    "id": "<FLOW_ID>",
    "amount": "1.00",
    "currency": "USD",
    "executionState": "initiated",
    "settlementState": "none"
  }
}
```

```http
GET https://app.dynamicauth.com/api/v0/server/<ENVIRONMENT_ID>/flow/<FLOW_ID>
Authorization: Bearer <DYNAMIC_SERVER_TOKEN>
```

Compare the server-returned `destinationConfig`, `settlementConfig`, amount, currency and memo references against ONE’s saved attempt before enabling payment. Preserve the returned `expiresAt`, and limit creation to the remaining intent lifetime when an attempt starts later.

Dynamic’s tested read returned the destination and receiving configuration, but did not echo `disableSwaps: false`. Record that flag as sent but unconfirmed by readback, and leave routing validation to the actual quote. The local test used its payment-intent reference as `memo.orderId`; the separate intent and attempt fields above are proposed product additions. [Flow API](https://www.dynamic.xyz/docs/flow/api)

## 4. Connect the payer and attach the source

**Actor: ONE checkout → connected wallet → Dynamic SDK API · Documented, not yet tested**

The customer connects their wallet and selects a supported funding network, after which checkout supplies that wallet’s public address to Flow. This is the first point where the payer address enters the payment sequence.

```http
POST https://app.dynamicauth.com/api/v0/sdk/<ENVIRONMENT_ID>/flow/<FLOW_ID>/source
Content-Type: application/json
```

```json
{
  "sourceType": "wallet",
  "fromAddress": "<CONNECTED_PAYER_ADDRESS>",
  "fromChainName": "EVM",
  "fromChainId": "421614"
}
```

```json
{
  "sessionToken": "<FLOW_SESSION_TOKEN>",
  "flow": { "id": "<FLOW_ID>", "executionState": "source_attached" }
}
```

The initial attachment needs no provider token and returns its session token once, which checkout retains privately for subsequent mutations. Reattaching a source uses that existing token; server bearer credentials never enter the payer’s browser or these SDK endpoints.

ONE displays screening progress while Flow’s risk state is pending, and enables payment only after an acceptable decision. A blocked or review result enters ONE’s agreed handling path rather than attempting another wallet automatically. [Source attachment and authentication](https://www.dynamic.xyz/docs/flow/api)

## 5. Show the quote

**Actor: ONE checkout → Dynamic SDK API · Documented, not yet tested**

```http
POST https://app.dynamicauth.com/api/v0/sdk/<ENVIRONMENT_ID>/flow/<FLOW_ID>/quote
X-Dynamic-Flow-Session-Token: <FLOW_SESSION_TOKEN>
Content-Type: application/json
```

```json
{
  "fromTokenAddress": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  "slippage": 0.005
}
```

Checkout displays the returned `quote.fromAmount`, `quote.toAmount`, fees, estimated time and expiry, retaining `quoteVersion` for the current offer. Source network and payer come from step four, while the receiving token and address remain those fixed at creation.

A quote-time `toAddress` or signing transaction recipient may belong to the route’s contract, so neither replaces the server-verified merchant destination. When the quote expires, request another and show its updated terms before asking the customer to approve payment. [Quote and prepare](https://www.dynamic.xyz/docs/flow/api)

## 6. Prepare, approve and report submission

**Actor: ONE checkout → Flow; connected wallet → blockchain; checkout → Flow · Documented, not yet tested**

```http
POST https://app.dynamicauth.com/api/v0/sdk/<ENVIRONMENT_ID>/flow/<FLOW_ID>/prepare
X-Dynamic-Flow-Session-Token: <FLOW_SESSION_TOKEN>
Content-Type: application/json
```

```json
{
  "assertBalanceForGasCost": true,
  "assertBalanceForTransferAmount": true
}
```

Use `quote.signingPayload` returned by preparation, including any required token approval, after confirming the connected wallet and funding network still match. The payer’s wallet signs and submits the transaction, then returns the source transaction hash to checkout.

```http
POST https://app.dynamicauth.com/api/v0/sdk/<ENVIRONMENT_ID>/flow/<FLOW_ID>/broadcast
X-Dynamic-Flow-Session-Token: <FLOW_SESSION_TOKEN>
Content-Type: application/json
```

```json
{ "txHash": "<SOURCE_TX_HASH>" }
```

The broadcast API reports an already-submitted transaction to Flow, while the actual network submission happens in the wallet. Preserve the hash before reporting it, so a reporting failure can be reconciled without asking the payer to send again. [Signing and broadcast](https://www.dynamic.xyz/docs/flow/api)

## 7. Track delivery and ONE account credit

**Actor: Flow → ONE reconciliation; ONE custody and ledger → merchant receipt · Provider events documented; ONE integration proposed**

```http
GET https://app.dynamicauth.com/api/v0/sdk/<ENVIRONMENT_ID>/flow/<FLOW_ID>
```

Prototype checkout can poll this unauthenticated provider read, while production ONE services consume verified `flow.execution.updated`, `flow.settlement.updated` and `flow.risk.updated` webhooks. Webhooks contain state transitions rather than complete Flow objects, so retrieve provider state when reconciliation needs more context.

For a completed settlement event, carry `data.flowId`, `data.newState` and `data.additionalData.settlementTxHash`, together with destination `chainName` and `chainId`. Verify the provider signature and environment, resolve the saved ONE attempt, and deduplicate repeated or out-of-order events before updating records. [Flow events](https://www.dynamic.xyz/docs/flow/webhooks)

Match the destination transfer to ONE’s custody deposit and existing ledger credit using the account, network, token, destination transaction and transfer identity. The exact custody event fields and credit lookup still need confirmation; this specification does not invent a public credit endpoint.

ONE can show “Funds delivered” from verified settlement evidence while displaying account credit as pending until its own ledger confirms it. Flow events must never independently create a second credit for a deposit already handled by ONE’s custody process.

## Records and service responsibilities

**Order → ONE intent → ONE attempt → Flow → Destination transfer → Custody deposit → ONE credit**

| Owner | Records or behaviour to extend |
| --- | --- |
| Account / wallet services | Merchant ownership, selected `accountId` or `walletId`, receiving addresses, supported token/network mapping and configuration version |
| Gateway / payment orchestration | Intent, attempt, order reference, amount, currency, expiry, settlement snapshot, checkout access and idempotency |
| Flow adapter | Server token, environment, provider Flow ID, immutable destination readback and provider errors |
| ONE checkout | Wallet connection, source attachment, private Flow session token, quote review and wallet approval |
| Reconciliation | Independent execution/risk/settlement states, source and destination hashes, deposit match, ledger reference and deduplicated event handling |

These are service responsibilities for ONE to map onto its existing implementation, without assuming each responsibility requires a new deployed service. Issuing and restoring checkout access, protecting the one-time Flow session token and preventing duplicate active attempts remain part of the proposed Gateway work.

## Status shown to users

| ONE display label · proposed | Required evidence | What it does not establish |
| --- | --- | --- |
| Awaiting payment | Active intent and `executionState: initiated` | Connected payer or available funds |
| Checking wallet | Source attached and risk pending | Permission to sign before screening completes |
| Ready to pay | Cleared risk, current quote and verified destination | Transaction submission |
| Payment submitted | Recorded source transaction hash | Source confirmation or destination receipt |
| Processing delivery | Source confirmed or settlement in progress | Completed delivery or ONE credit |
| Funds delivered · credit pending | Verified `settlementState: completed` and destination transfer | ONE ledger credit |
| Account credited | Matched custody deposit and confirmed existing ledger credit | Fiat conversion |
| Needs attention | Blocked/review risk, provider failure or unmatched receipt | Refund, cancellation or safe automatic replay |
| Expired / cancelled | Eligible pre-submission attempt reaches the corresponding provider state | Reversal of any transaction already broadcast |

Keep the provider’s execution, settlement and risk states separately from ONE’s deposit and credit status. A browser redirect, refreshed balance or source confirmation cannot independently turn the payment into an account credit.

## Acceptance criteria

| Scenario | Expected product behaviour |
| --- | --- |
| Receiving address changes in ONE | New attempts resolve current approved details; existing attempts retain their original destination snapshot |
| Missing, ambiguous or unsupported destination | Stop before Flow creation and identify the receiving configuration that needs attention |
| Payer has not connected | Create the Flow successfully with no payer address or manual receiving-address lookup |
| Customer connects a wallet | Attach that wallet’s address and selected funding chain; keep the merchant destination unchanged |
| Readback disagrees with ONE’s saved terms | Prevent payment and preserve the created Flow ID for investigation |
| Duplicate click or uncertain create response | Reuse the existing attempt or reconcile it; never create another execution blindly |
| Quote expires, balance is insufficient or wallet changes | Refresh or reattach only in an eligible state, then request approval of the resulting terms |
| Wallet submits but reporting fails | Recover the recorded source hash and provider state before any retry; do not resubmit the payment |
| Source confirms before settlement | Continue showing delivery in progress until destination settlement is confirmed |
| Settlement completes before ONE credits | Show delivered with credit pending, then link the existing credit when matched |
| Repeated or delayed webhook | Verify, deduplicate and reconcile state without creating another receipt or ledger credit |
| Customer reloads checkout | Restore the authorised ONE attempt and provider state; define secure session recovery before claiming resumable payment |

## Follow-up items

| Item | Decision needed from ONE |
| --- | --- |
| Supported receiving routes | Authoritative account-to-network/token mapping, including whether any sandbox route supports actual custody credit |
| Deposit and ledger matching | Existing custody event, unique transfer identity, ledger reference and correction handling |
| Checkout access and recovery | Intent-scoped access, session-token handling, shared-link behaviour and resume rules |
| Existing service ownership | Where account resolution, Gateway orchestration, Flow integration and reconciliation fit in the current stack |

The next test adds wallet connection, a valid quote, payer approval and destination settlement to the already verified address handoff. Business wallets then extend the receiving resource under account services, while the checkout and Flow lifecycle remain the same.
