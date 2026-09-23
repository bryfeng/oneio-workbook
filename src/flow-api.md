# Fireblocks Flow — white-label API outline

**ONE integration draft · Official contracts reviewed 23 September 2026**

ONE’s white-label checkout uses Flow’s standard payment API underneath its own screens and branding. The entry point creates the payment; ONE then drives wallet connection, quoting, signing and status through the SDK or HTTP calls below. [Flow API guide](https://www.dynamic.xyz/docs/flow/api)

The [collection product specification](flow-experience.html) connects these calls to ONE’s receiving accounts, user experience, records and acceptance criteria. Its worked testnet trace uses a routed payment; the Base mainnet illustration below remains a separate configuration example.

## 1. Create the payment from ONE’s backend

```http
POST https://app.dynamicauth.com/api/v0/server/{environmentId}/flow/payment
Authorization: Bearer <DYNAMIC_SERVER_TOKEN>
Content-Type: application/json
```

`environmentId` identifies the enabled Dynamic environment, and the server token needs the `flow.write` scope. The fixed `payment` mode means ONE sets the requested amount; amount, currency, settlement and destination are fixed at creation.

| Parameter | Type / required | What ONE supplies |
| --- | --- | --- |
| `amount` | String · required | Invoice amount, such as `"25.00"` |
| `currency` | String · required | Invoice denomination, such as `"USD"` |
| `settlementConfig.strategy` | Enum · required | `cheapest`, `fastest` or `preferred_order` |
| `settlementConfig.settlements[]` | Array · required | Accepted destination asset/network combinations |
| `settlements[].chainName` / `.chainId` | Strings · required | Chain family and network ID, such as `"EVM"` / `"8453"` |
| `settlements[].tokenAddress` / `.symbol` / `.tokenDecimals` | String / string / integer · required | Destination token contract, symbol and decimals |
| `destinationConfig.destinations[]` | Array · required | Approved receiving destinations |
| `destinations[].chainName` / `.type` / `.identifier` | Strings · required | Matching chain family, `"address"`, and verified receiving address |
| `memo` | Object · optional | ONE request, attempt and order references |
| `expiresIn` | Integer · optional | Lifetime in seconds; explicitly set `900` in this example |
| `disableSwaps` | Boolean · optional | `true` restricts quotes to direct transfers; the testnet trace uses `false` for routing |

The shortened `settlements[]` and `destinations[]` rows refer to their parent objects above. ONE resolves the destination from the merchant’s account or business wallet before creating the payment. [Create-flow schema](https://www.dynamic.xyz/docs/api-reference/server/create-a-flow)

**Illustrative request — USD invoice, USDC settlement on Base**

```json
{
  "amount": "25.00",
  "currency": "USD",
  "settlementConfig": {
    "strategy": "cheapest",
    "settlements": [{
      "chainName": "EVM",
      "chainId": "8453",
      "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "symbol": "USDC",
      "tokenDecimals": 6
    }]
  },
  "destinationConfig": {
    "destinations": [{
      "chainName": "EVM",
      "type": "address",
      "identifier": "<ONE_VERIFIED_RECEIVING_ADDRESS>"
    }]
  },
  "memo": {
    "oneIntentId": "DEMO-INTENT-1042",
    "oneAttemptId": "DEMO-ATTEMPT-1042",
    "orderId": "DEMO-ORDER-1042"
  },
  "expiresIn": 900,
  "disableSwaps": true
}
```

The address placeholder makes this an illustration; Base support in ONE’s custody environment remains to be confirmed. USD is the invoice denomination, while the quote and settlement record determine the actual token quantities.

**Response: HTTP 201, with the created object under `flow`**

ONE stores `flow.id`, the destination snapshot and returned expiry against `DEMO-ATTEMPT-1042`, then opens its checkout with that Flow reference. A new wallet model changes the receiving-address mapping; it does not require a different payment-creation endpoint.

**Other documented controls**

| Parameter | Purpose / initial treatment |
| --- | --- |
| `settlementConfig.settlements[].isNative` | Native-token flag; optional, default `false` |
| `pegStablecoins` | Peg supported stablecoins to the invoice currency at quote time; default `false`, omit initially |
| `feeConfig.recipients[]` | Optional swap-fee recipients, each with `walletAddress` and fractional `percentage`; omit initially |
| `uiConfig.returnUrl` | Optional payer return URL; origin must be registered for the environment, and a redirect is not settlement evidence |

The guide and reference show different expiry defaults, so set `expiresIn` explicitly and verify the returned expiry. Memo provides correlation metadata; ONE still needs its own access checks and duplicate-request handling.

## 2. Drive the payment inside ONE’s checkout

All paths below use the same base URL and the prefix `/sdk/{environmentId}/flow/{flowId}`. The example payer uses Base USDC, matching the destination because `disableSwaps` is enabled.

| Step | Method + suffix | Parameters for this example | Result |
| --- | --- | --- | --- |
| Attach payer | `POST /source` | `sourceType: "wallet"`, `fromAddress: "<PAYER_ADDRESS>"`, `fromChainName: "EVM"`, `fromChainId: "8453"` | Returns `sessionToken` and updated `flow` |
| Get quote | `POST /quote` | `fromTokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"`; optional `slippage: 0.005` for 0.5% | Payment quantities, fees, expiry and route |
| Prepare | `POST /prepare` | `assertBalanceForGasCost: true`, `assertBalanceForTransferAmount: true` | Signing payload; token approval may also be required |
| Sign and submit | Connected wallet / SDK | Returned signing payload and any required approval | Payer authorises the onchain transaction; wallet returns its hash |
| Report submission | `POST /broadcast` | `txHash: "<PAYER_TRANSACTION_HASH>"` | Flow starts tracking the submitted transaction |
| Read progress | `GET` with no suffix | Path identifiers only | Execution, settlement and risk states |
| Cancel before submission | `POST /cancel` | No body parameters documented | Cancels an eligible pre-broadcast Flow; does not refund funds |

The first `/source` call mints the session token without requiring one, and returns it only once. Quote, prepare, broadcast and cancel use `X-Dynamic-Flow-Session-Token`; reattaching a source uses the existing token. Flow reads need no provider authentication, while ONE’s own merchant records remain access-controlled.

Keep the server bearer token off these SDK routes, because they use the Flow session token instead. The `/broadcast` call reports a transaction already submitted by the wallet; it does not send funds itself. [Payment lifecycle and authentication](https://www.dynamic.xyz/docs/flow/api#payment-flow)

## 3. Connect settlement to ONE’s receipt

ONE receives `flow.execution.updated`, `flow.settlement.updated` and `flow.risk.updated` through its verified webhook handler, then matches completed settlement evidence to its custody deposit and existing credit using the destination transaction hash and network.

**ONE request → ONE attempt → `flow.id` → destination transfer → custody deposit → existing credit / receipt**

Source confirmation alone does not establish receipt, and a browser return cannot establish merchant credit. If the destination is a business wallet, show its receipt separately from ONE custody or bank balances. [Flow events](https://www.dynamic.xyz/docs/flow/webhooks)

## Optional: Generate a link to ONE’s checkout

For shareable payment links, `POST /server/{environmentId}/payment-links` accepts the same creation fields plus required `baseUrl`. Set it to ONE’s actual checkout URL, with its origin registered in Dynamic; the response adds `paymentUrl` alongside `flow`.

ONE’s page reads the `flow` query parameter and drives the same checkout sequence above. This endpoint generates the link; ONE still supplies the white-label checkout interface and receipt integration. [Payment links](https://www.dynamic.xyz/docs/flow/payment-links)
