/* Source snapshot: 20 September 2026. Proposed services are not live APIs. */
window.SHORTLIST_DATA = {
  "title": "ONE API extensions",
  "eyebrow": "CLEARER / ONE",
  "subtitle": "How we can build on ONE’s accounts, wallets and payment services.",
  "updated": "20 September 2026",
  "sections": [
    {
      "id": "inventory",
      "number": "01",
      "nav": "Current inventory",
      "title": "Current inventory",
      "intro": "ONE documents 25 API operations that we can build on, once we confirm sandbox access.",
      "columns": [
        "Existing capability",
        "What it enables",
        "Published API"
      ],
      "rows": [
        {
          "id": "customer",
          "title": "Customer & access",
          "summary": "Identify the business and connect to ONE’s API.",
          "status": "3 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 1,
              "method": "POST",
              "path": "/api/v1/auth/token",
              "technical": "Administrator email and password produce an accessToken.",
              "business": "Connect the integration to ONE; merchant onboarding and wallet signing each require their own process."
            },
            {
              "number": 2,
              "method": "GET",
              "path": "/api/v1/organisation",
              "technical": "Returns organisation identity, master-customer status, subsidiaries and access flags.",
              "business": "Identify the business we are working with and which subsidiaries the integration can access."
            },
            {
              "number": 3,
              "method": "POST",
              "path": "/api/v1/organisation/subsidiaries",
              "technical": "Creates a subsidiary under a master customer using registration, contact, legal-type and address details; returns organisation information.",
              "business": "Add a subsidiary to the ONE customer structure, subject to the customer’s eligibility and access."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "The customer record tells us which business we are serving; wallet ownership and signing permissions still need their own checks."
        },
        {
          "id": "accounts",
          "title": "Accounts & balances",
          "summary": "See account balances and open supported bank accounts.",
          "status": "4 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 4,
              "method": "GET",
              "path": "/api/v1/accounts",
              "technical": "Lists accounts; description supports accountType, IBAN/account-number/sort-code selectors. Returns IDs, currency, balance, available balance, pending funds, status and bank/crypto receiving details.",
              "business": "Show the merchant’s accounts, balances and receiving details, including cryptoAddresses for crypto accounts."
            },
            {
              "number": 5,
              "method": "POST",
              "path": "/api/v1/accounts",
              "technical": "Creates a bank account with type (international / domestic), currency (published enum: EUR / GBP) and isPrimary; returns account and bank identifiers.",
              "business": "Open a supported fiat account for receiving and sending payments; Dynamic wallet creation is separate."
            },
            {
              "number": 6,
              "method": "GET",
              "path": "/api/v1/accounts/{accountId}",
              "technical": "Reads one ONE account's details, balances and status.",
              "business": "Show the account details and check how much is available for a payment."
            },
            {
              "number": 7,
              "method": "PUT",
              "path": "/api/v1/accounts/{accountId}/primary",
              "technical": "Sets an account as primary.",
              "business": "Choose the default ONE account, while keeping the Flow receiving destination separately configured."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "Bank-account creation currently lists EUR and GBP, while the account-list filters and their exact casing still need clarification from ONE."
        },
        {
          "id": "custody",
          "title": "Crypto custody",
          "summary": "Save withdrawal addresses and send crypto held by ONE.",
          "status": "5 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 8,
              "method": "GET",
              "path": "/api/v1/crypto-custody/withdrawal-addresses",
              "technical": "Lists registered destinations: ID, name, address, asset ID, status and creation time.",
              "business": "Let the customer choose from the saved destinations for withdrawing crypto from ONE custody."
            },
            {
              "number": 9,
              "method": "POST",
              "path": "/api/v1/crypto-custody/withdrawal-addresses",
              "technical": "Registers a destination using name, address, asset ID and optional tag; returns the record and status.",
              "business": "Save an address for future withdrawals, with approval still subject to ONE’s actual process."
            },
            {
              "number": 10,
              "method": "PUT",
              "path": "/api/v1/crypto-custody/withdrawal-addresses/{id}",
              "technical": "Updates the destination's name.",
              "business": "Rename the saved recipient while keeping the underlying withdrawal destination exactly the same."
            },
            {
              "number": 11,
              "method": "DELETE",
              "path": "/api/v1/crypto-custody/withdrawal-addresses/{id}",
              "technical": "Removes the registered address.",
              "business": "Remove the address from future withdrawal choices, while any completed onchain payment remains final."
            },
            {
              "number": 12,
              "method": "POST",
              "path": "/api/v1/crypto-custody/withdrawals",
              "technical": "Submits a withdrawal from a ONE custody accountId to withdrawalAddressId, with amount, fee options, note and optional externalTxId. Returns withdrawal ID, transaction ID, external reference, status and amount.",
              "business": "Send crypto held by ONE to an approved address; spending from a Dynamic wallet requires that wallet’s authorised signer."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "These calls withdraw funds held by ONE, so a merchant’s Dynamic wallet needs its own authorised signer. ONE rejects repeated externalTxId values, which means we need to check the original request before trying again."
        },
        {
          "id": "fx",
          "title": "FX deals",
          "summary": "Get an FX quote, book it and arrange the payment.",
          "status": "4 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 13,
              "method": "GET",
              "path": "/api/v1/exchange-rates",
              "technical": "currencyFrom and currencyTo return an indicative rate, timestamp and staleness indicator.",
              "business": "Show an estimated conversion value, with a separate quote and booking needed to execute."
            },
            {
              "number": 14,
              "method": "POST",
              "path": "/api/v1/payout/spot-rate",
              "technical": "Requests an FX quote using lock side, payment currency, settlement currency and amount; returns quoteId, rate and amounts.",
              "business": "Get the price and amounts for the conversion before committing to the deal."
            },
            {
              "number": 15,
              "method": "POST",
              "path": "/api/v1/payout/book-deal",
              "technical": "Books a quoteId; returns order number, token and settlement date.",
              "business": "Book the quoted deal, which commits the customer to the FX transaction rather than previewing it."
            },
            {
              "number": 16,
              "method": "POST",
              "path": "/api/v1/payout/instruct-deal",
              "technical": "Assigns booked orders to payments/beneficiaries and settlement accounts; returns order/value-date information.",
              "business": "Tell ONE how to fund the booked deal and where to pay or allocate it."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "We still need ONE’s crypto-to-fiat trading contract, since the published FX endpoints do not explain that part of the process."
        },
        {
          "id": "payments",
          "title": "Bank payments",
          "summary": "Send bank payments or move funds between ONE accounts.",
          "status": "7 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 17,
              "method": "POST",
              "path": "/api/v1/payments/swift",
              "technical": "Submits source account, amount/currency, recipient and bank/address information, reference and fee option; returns a payment ID.",
              "business": "Request an international bank payment through SWIFT."
            },
            {
              "number": 18,
              "method": "POST",
              "path": "/api/v1/payments/sepa",
              "technical": "Submits account, amount/currency, recipient name, IBAN and country, plus optional details; returns a payment ID.",
              "business": "Request a payment over the SEPA rail, subject to supported currency and account eligibility."
            },
            {
              "number": 19,
              "method": "POST",
              "path": "/api/v1/payments/chaps",
              "technical": "Submits source/recipient bank details, amount/currency, name and required purpose/category-purpose fields; returns a payment ID.",
              "business": "Request a UK CHAPS payment."
            },
            {
              "number": 20,
              "method": "POST",
              "path": "/api/v1/payments/fps",
              "technical": "Submits source/recipient bank details, amount/currency, name and reference; returns a payment ID.",
              "business": "Request a UK Faster Payment."
            },
            {
              "number": 21,
              "method": "POST",
              "path": "/api/v1/payments/transfers",
              "technical": "Uses fromAccountId, toAccountId, amount and description; returns a payment ID.",
              "business": "Move funds between supported ONE account IDs, with cross-currency conversion still to be confirmed."
            },
            {
              "number": 22,
              "method": "POST",
              "path": "/api/v1/payments/internal",
              "technical": "Uses source account and recipient bank identifiers, amount and description; returns a payment ID. Its descriptive documentation is TODO.",
              "business": "Address an internal payment using recipient details, once ONE confirms recipient eligibility and ownership restrictions."
            },
            {
              "number": 23,
              "method": "GET",
              "path": "/api/v1/payments/{paymentId}",
              "technical": "Returns payment ID, state, payment transaction and fee transaction.",
              "business": "Track the payment and its fee separately, following the status through to completion."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "We need to follow each payment through to completion and confirm which recipients the internal-payment call supports. The public docs do not describe crypto batches, so we should check what the dashboard’s batch service already handles."
        },
        {
          "id": "records",
          "title": "Transactions",
          "summary": "Trace payments, fees and other account activity.",
          "status": "2 calls",
          "tone": "neutral",
          "operations": [
            {
              "number": 24,
              "method": "GET",
              "path": "/api/v1/transactions",
              "technical": "Paginates transaction records with filters for bank identifiers, currency, dates, amounts, status, type, references and counterparties; may include subsidiary transactions.",
              "business": "Find payments, fees and account activity for reconciliation; the published filters do not include accountId."
            },
            {
              "number": 25,
              "method": "GET",
              "path": "/api/v1/transactions/{transactionId}",
              "technical": "Returns a specific transaction with its status, amounts/currencies and references.",
              "business": "Open the transaction record to investigate a payment or match it against account activity."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ],
          "note": "We need to link ONE payment IDs, account transactions and blockchain hashes while keeping each reference distinct. ONE still needs to confirm how callbacks are delivered and how we authenticate them."
        }
      ]
    },
    {
      "id": "functionality",
      "number": "02",
      "nav": "What we want",
      "title": "What we want to enable",
      "intro": "",
      "columns": [
        "Capability",
        "What the merchant can do"
      ],
      "rows": [
        {
          "id": "business-wallet",
          "title": "Business wallets",
          "summary": "Give the business a wallet with team access and spending controls.",
          "status": "Proposed",
          "tone": "neutral",
          "blocks": [
            {
              "label": "Ownership",
              "text": "The wallet belongs to the business as people join or leave, with checkout, payouts and treasury using the same ONE wallet reference."
            },
            {
              "label": "Team controls",
              "text": "The team can invite staff, change signing access and set spending policies, while account administration and wallet signing remain separate permissions."
            },
            {
              "label": "Availability",
              "text": "Dynamic Business Accounts and the policy helpers are in early access, with multi-person quorum approvals still listed as coming soon."
            }
          ]
        },
        {
          "id": "collection",
          "title": "Crypto collection",
          "summary": "Let customers pay through checkout or a link, then confirm delivery.",
          "status": "Proposed",
          "tone": "neutral",
          "blocks": [
            {
              "label": "Payment terms",
              "text": "We set the amount, destination, asset and network up front, while the payer can use a supported external wallet."
            },
            {
              "label": "Receipt",
              "text": "Each order should link to its Flow, source transaction and settlement transaction, along with the amounts and fees. We confirm delivery before marking it settled, because source confirmation alone does not prove the merchant received the funds. Any conversion and fiat credit would follow as separate steps after the crypto arrives."
            }
          ]
        },
        {
          "id": "money-out",
          "title": "Crypto payouts",
          "summary": "Send one payment or a batch, issue refunds and track each recipient.",
          "status": "Proposed",
          "tone": "neutral",
          "blocks": [
            {
              "label": "Payments and refunds",
              "text": "A refund creates a new outgoing payment linked to the original receipt, rather than cancelling the Flow that already delivered it."
            },
            {
              "label": "Batch submission",
              "text": "We can take recipients from a CSV or API request and validate the list before submission. For the first version, each batch uses one funding source and asset/network, with an amount, reference, fee and result for every recipient."
            },
            {
              "label": "Authority",
              "text": "Payments funded from ONE custody use its withdrawal service, while business-wallet payments need an authorised signer and can use Flow for supported routes."
            },
            {
              "label": "Partial completion",
              "text": "Recipients can be paid independently, so we preserve completed payments and check uncertain results before retrying eligible failures."
            },
            {
              "label": "Reuse candidate",
              "text": "We should first understand what ONE’s dashboard already does for batches, since we have not verified that service or a public crypto batch API."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ]
        },
        {
          "id": "fiat",
          "title": "Auto-conversion",
          "summary": "We’re putting this on hold for now and keeping the notes for later.",
          "status": "On hold",
          "tone": "pending",
          "blocks": [
            {
              "label": "Standing instruction",
              "text": "The merchant activates a ONE-controlled address and agrees the asset, network, fiat account, rate and fee rules that apply to eligible deposits."
            },
            {
              "label": "Execution",
              "text": "ONE checks the deposit, sweeps funds if needed, executes the trade and credits the actual fiat proceeds, keeping the deposit, trade, fees and credit linked."
            },
            {
              "label": "Exceptions",
              "text": "Unsupported deposits and failed conversions need a clear resolution path, with fiat credited only after conversion is confirmed."
            }
          ],
          "paused": true
        }
      ],
      "tag": "Proposed"
    },
    {
      "id": "providers",
      "number": "03",
      "nav": "Dynamic & Flow",
      "title": "What Dynamic & Flow provide",
      "intro": "",
      "columns": [
        "Provider",
        "What we can use",
        "Availability"
      ],
      "rows": [
        {
          "id": "dynamic",
          "title": "Dynamic",
          "summary": "Business wallets, team access and signing policies.",
          "status": "Early access",
          "tone": "pending",
          "groups": [
            {
              "id": "dynamic-account",
              "title": "Wallets",
              "summary": "A business account owns wallets, with members and wallet-specific signers.",
              "status": "Early access",
              "tone": "pending",
              "operations": [
                {
                  "path": "createBusinessAccount / listBusinessAccounts / getBusinessAccount",
                  "technical": "Create or read the team account. The creator becomes its owner."
                },
                {
                  "path": "createWalletForBusinessAccount / addWalletToBusinessAccount",
                  "technical": "Create a wallet or link an existing embedded wallet. The caller becomes its first signer."
                }
              ],
              "note": "We can put Dynamic’s wallet methods behind ONE’s shared account experience, with Gateway using the same wallet record as other products. We still need to confirm early-access availability in ONE’s environment before depending on it."
            },
            {
              "id": "dynamic-access",
              "title": "Access & policies",
              "summary": "Manage the team and constrain how authorised wallet signers act.",
              "status": "Early access",
              "tone": "pending",
              "operations": [
                {
                  "path": "addBusinessAccountMember / updateBusinessAccountMemberRole / removeBusinessAccountMember",
                  "technical": "Manage administrators and viewers; removing a member also removes their signer records."
                },
                {
                  "path": "addBusinessAccountSigner / removeBusinessAccountSigner",
                  "technical": "Grant or revoke wallet signing. Adding a signer needs owner/admin authority plus an active signer on that wallet."
                },
                {
                  "path": "checkStepUpAuth + an authentication method",
                  "technical": "Obtain fresh, action-scoped authentication for sensitive changes."
                },
                {
                  "path": "createPolicy / getPolicy / removePolicyRules",
                  "technical": "Apply account, wallet and signer rules. All applicable policy layers must pass."
                }
              ],
              "note": "Account administration and wallet signing use separate permissions, with spending policies controlling what an authorised signer can do. Multi-person quorum approvals are still coming soon, so we should leave them out of the current capability claim."
            }
          ],
          "sources": [
            {
              "label": "Business Accounts",
              "url": "https://www.dynamic.xyz/docs/javascript/reference/business-accounts/overview"
            },
            {
              "label": "Create / link wallets",
              "url": "https://www.dynamic.xyz/docs/javascript/reference/business-accounts/add-wallets"
            },
            {
              "label": "Wallet policies",
              "url": "https://www.dynamic.xyz/docs/javascript/reference/business-accounts/policies/overview"
            },
            {
              "label": "Signer management",
              "url": "https://www.dynamic.xyz/docs/javascript/reference/business-accounts/manage-signers"
            },
            {
              "label": "Quorum availability",
              "url": "https://www.dynamic.xyz/docs/javascript/reference/business-accounts/policies/quorum-policies"
            }
          ]
        },
        {
          "id": "flow",
          "title": "Fireblocks Flow",
          "summary": "Create payments, route funds and track delivery to the merchant.",
          "status": "Documented",
          "tone": "neutral",
          "groups": [
            {
              "id": "flow-create",
              "title": "Create payments",
              "summary": "Create a fixed-amount checkout, a payment link or a sender-amount deposit.",
              "status": "Documented",
              "tone": "neutral",
              "operations": [
                {
                  "path": "POST /server/{environmentId}/flow/payment",
                  "technical": "Backend fixes payment terms and settlement destination."
                },
                {
                  "path": "POST /server/{environmentId}/payment-links",
                  "technical": "Creates a payment Flow and a shareable payer URL."
                },
                {
                  "path": "POST /server/{environmentId}/flow/deposit",
                  "technical": "Supports funding where the sender chooses the amount."
                }
              ],
              "note": "Flow requires a Dynamic environment, but the payer does not have to use an embedded wallet. It can send funds to a compatible, approved ONE receiving address, with ONE handling the conversion and fiat credit separately. A Flow deposit address alone does not give us the standing auto-conversion service we want."
            },
            {
              "id": "flow-execute",
              "title": "Fund & execute",
              "summary": "Attach a source, screen it, quote the route and prepare a payment for signing.",
              "status": "Documented",
              "tone": "neutral",
              "operations": [
                {
                  "path": "POST /sdk/{environmentId}/flow/{id}/source",
                  "technical": "Attach a wallet, exchange or deposit-address source and start screening."
                },
                {
                  "path": "POST /sdk/{environmentId}/flow/{id}/quote",
                  "technical": "Return payer and receipt amounts, fees and quote expiry."
                },
                {
                  "path": "POST /sdk/{environmentId}/flow/{id}/prepare",
                  "technical": "Prepare the wallet signing payload after checks."
                },
                {
                  "path": "POST /sdk/{environmentId}/flow/{id}/broadcast",
                  "technical": "Report a transaction already signed and submitted by the funding wallet."
                }
              ],
              "note": "The funding wallet signs outside the HTTP API, while our current testnet demo covers only same-token wallet payments. We still need to test cross-chain routing before treating it as demonstrated behaviour."
            },
            {
              "id": "flow-track",
              "title": "Track delivery",
              "summary": "Track risk, source execution and final delivery as separate states.",
              "status": "Documented",
              "tone": "neutral",
              "operations": [
                {
                  "path": "GET /sdk/{environmentId}/flow/{id}",
                  "technical": "Read current risk, execution and settlement state."
                },
                {
                  "path": "POST /sdk/{environmentId}/flow/{id}/cancel",
                  "technical": "Cancel in supported pre-broadcast states; not a refund."
                },
                {
                  "path": "POST /environments/{environmentId}/webhooks",
                  "technical": "Subscribe to execution, risk and settlement updates."
                }
              ],
              "note": "We should keep the Flow ID and delivery records, verify incoming notifications and handle duplicates before creating the merchant’s receipt."
            },
            {
              "id": "flow-out",
              "title": "Route payouts",
              "summary": "Route an outgoing payment from a treasury, vault or authorised server wallet.",
              "status": "HTTP API",
              "tone": "neutral",
              "operations": [
                {
                  "path": "POST /server/{environmentId}/flow/withdraw",
                  "technical": "Create a money-out Flow with the recipient destination; the funding wallet still signs."
                }
              ],
              "note": "We can use a Flow for each routed payout when its funding signer is supported. ONE would still validate the batch, submit payments and reconcile each recipient, because the Flow guide does not supply that merchant batch API."
            }
          ],
          "sources": [
            {
              "label": "Flow HTTP API",
              "url": "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api"
            }
          ]
        }
      ]
    },
    {
      "id": "integration",
      "number": "04",
      "nav": "How we integrate",
      "title": "How we integrate into ONE",
      "intro": "We should put wallets, payouts and conversion in shared ONE services that Gateway can use.",
      "columns": [
        "ONE service",
        "Integration",
        "Change"
      ],
      "rows": [
        {
          "id": "reuse",
          "title": "Existing ONE APIs",
          "summary": "Build on the customer, account and payment APIs already documented.",
          "status": "Reuse",
          "tone": "neutral",
          "blocks": [
            {
              "label": "Contract",
              "text": "We can build around the existing /api/v1 calls while preserving their behaviour and who can authorise each movement of funds."
            },
            {
              "label": "Service work",
              "text": "Where the services need to connect, we can add adapters and map their IDs while keeping Dynamic wallet balances separate from bank balances."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            }
          ]
        },
        {
          "id": "wallet-integration",
          "title": "Business wallets",
          "summary": "Add shared business wallets, with optional links from the organisation record.",
          "status": "New + enhance",
          "tone": "new",
          "groups": [
            {
              "id": "registry",
              "title": "Wallet resource",
              "summary": "Manage business wallets as shared ONE resources, independently of Gateway checkout.",
              "status": "New endpoints",
              "tone": "new",
              "operations": [
                {
                  "path": "POST /api/v1/crypto-wallets",
                  "technical": "Proposed account-service route: register a Dynamic-provisioned wallet after verifying the business relationship."
                },
                {
                  "path": "GET /api/v1/crypto-wallets · GET /api/v1/crypto-wallets/{id}",
                  "technical": "Proposed: read the merchant’s wallet resources, provider references, addresses and verification state."
                }
              ],
              "blocks": [
                {
                  "label": "Namespace",
                  "text": "We can use /api/v1/crypto-wallets as a working name alongside /api/v1/crypto-custody, or fit wallets into ONE’s account model if that is the better home. Either way, the wallet belongs outside /gateway/ so other products can use it."
                },
                {
                  "label": "Shared account object",
                  "text": "The wallet record should identify the business, wallet type, provider and signing model, with Gateway, payouts and treasury using the same wallet ID. We should keep wallet and bank balances distinct so the account view remains clear."
                },
                {
                  "label": "Provisioning and authority",
                  "text": "Onboarding should use Dynamic’s authenticated methods for creating wallets, managing members and granting signing access. The creator becomes the business account owner or first wallet signer as documented, while any ONE or server access needs explicit authority."
                }
              ]
            },
            {
              "id": "enrich",
              "title": "Organisation enhancement",
              "summary": "Let the current organisation response point to the merchant’s business wallets.",
              "status": "Parameter + fields",
              "tone": "new",
              "operations": [
                {
                  "path": "GET /api/v1/organisation?include=businessWallets",
                  "technical": "Proposed optional parameter; return businessWallets references alongside the existing organisation response."
                }
              ],
              "blocks": [
                {
                  "label": "Compatible enhancement",
                  "text": "Existing callers can keep the same response, while callers requesting businessWallets receive references to separately authorised wallet records without changing their account balances."
                },
                {
                  "label": "Alternative",
                  "text": "We can also list wallets through GET /api/v1/crypto-wallets alone, if ONE prefers to keep the organisation response as it is."
                }
              ]
            }
          ]
        },
        {
          "id": "collection-integration",
          "title": "Gateway collections",
          "summary": "Connect each checkout to the merchant’s receiving preferences and a Flow payment.",
          "status": "New + extend",
          "tone": "new",
          "groups": [
            {
              "id": "preferences",
              "title": "Settlement profiles",
              "summary": "Record the wallet, network and token the merchant wants to receive.",
              "status": "New endpoints",
              "tone": "new",
              "operations": [
                {
                  "path": "POST /gateway/v3/settlement-profiles",
                  "technical": "Proposed: validate a registered wallet and supported asset/network; return an immutable profile."
                },
                {
                  "path": "GET /gateway/v3/settlement-profiles/{id}",
                  "technical": "Proposed: read the authorised merchant’s profile."
                }
              ],
              "blocks": [
                {
                  "label": "Business rule",
                  "text": "When the merchant changes a receiving preference, we create a new profile so existing payments keep their original destination."
                },
                {
                  "label": "Small first version",
                  "text": "We can start with one wallet, network and token to prove the collection path."
                },
                {
                  "label": "Scope",
                  "text": "Gateway’s collection profile points to the shared ONE wallet record, while wallet creation and ownership stay with the account service. It could also reference a compatible, approved ONE auto-conversion address once the merchant has activated that separate service."
                }
              ]
            },
            {
              "id": "intent",
              "title": "Payment intents",
              "summary": "Give each order a durable ONE identity and a checkout URL.",
              "status": "New endpoints",
              "tone": "new",
              "operations": [
                {
                  "path": "POST /gateway/v3/payment-intents",
                  "technical": "Proposed body: amount, currency, merchantReference, settlementProfileId, optional expiry. Return intent ID, checkout URL and state."
                },
                {
                  "path": "GET /gateway/v3/payment-intents · GET /gateway/v3/payment-intents/{id}",
                  "technical": "Proposed: list requests or read their attempts and settlement receipt."
                },
                {
                  "path": "POST /gateway/v3/payment-intents/{id}/attempts",
                  "technical": "Proposed: create or resume a Flow from locked server-side terms."
                },
                {
                  "path": "POST /gateway/v3/payment-intents/{id}/cancel",
                  "technical": "Proposed: reconcile and cancel an unfunded request when still permitted."
                }
              ],
              "blocks": [
                {
                  "label": "Example contract",
                  "text": "amount: \"25.00\" · currency: \"USD\" · merchantReference: \"ORDER-1042\" · settlementProfileId: \"PROFILE-01\". We keep the payment amount separate from the token units the merchant receives."
                },
                {
                  "label": "Duplicate prevention",
                  "text": "Repeating the same create key and payload should return the original result, while an uncertain provider response needs checking before we create another Flow."
                }
              ]
            },
            {
              "id": "checkout-service",
              "title": "Checkout & reconciliation",
              "summary": "Connect the existing merchant and payer pages to real Flow attempts and verified events.",
              "status": "Extend services",
              "tone": "new",
              "blocks": [
                {
                  "label": "Checkout",
                  "text": "We create the Flow on the server, then use the client SDK to attach a source, get a quote and prepare signing. The checkout should still verify the destination before asking the payer to sign."
                },
                {
                  "label": "Reconciliation",
                  "text": "We link the intent, Flow and source/settlement transactions, then verify callbacks, handle duplicate events and recover the provider’s current state when needed."
                },
                {
                  "label": "Read responses",
                  "text": "The intent response should show the received asset, amount, fees, chain and transaction hashes, while distinguishing source progress from settlement and flagging uncertain outcomes."
                }
              ]
            }
          ]
        },
        {
          "id": "payout-integration",
          "title": "Crypto payouts",
          "summary": "Add crypto batches using ONE custody or an authorised wallet signer.",
          "status": "New + extend",
          "tone": "new",
          "groups": [
            {
              "id": "outbound-service",
              "title": "Funding & execution",
              "summary": "Use custody withdrawals for ONE-held funds and authorised wallet signing for merchant-held funds.",
              "status": "Extend services",
              "tone": "new",
              "blocks": [
                {
                  "label": "ONE custody funding",
                  "text": "For funds held by ONE, we can reuse /api/v1/crypto-custody/withdrawals with its existing account and destination permissions."
                },
                {
                  "label": "Business-wallet funding",
                  "text": "For business-wallet funds, we use the registered wallet and an authorised Dynamic signer, adding Flow withdrawal where routing is needed. The custody account ID and merchant wallet reference must stay distinct throughout that process."
                },
                {
                  "label": "Service ownership",
                  "text": "Single payouts, refunds and batches should share ONE’s crypto payout service, which Gateway can call alongside the dashboard and other products."
                }
              ]
            },
            {
              "id": "batch-service",
              "title": "Batch API",
              "summary": "Extend the merchant payout workflow with batch submission and recipient-level crypto execution.",
              "status": "New + extend",
              "tone": "new",
              "operations": [
                {
                  "path": "POST /api/v1/crypto-payouts/batches",
                  "technical": "Proposed: create a batch from API or parsed CSV data and return validation results without moving funds."
                },
                {
                  "path": "POST /api/v1/crypto-payouts/batches/{batchId}/submit",
                  "technical": "Proposed: submit the validated batch under the source account or wallet’s signing authority."
                },
                {
                  "path": "GET /api/v1/crypto-payouts/batches/{batchId}",
                  "technical": "Proposed: return aggregate progress plus each item’s status, references, fee and transaction evidence."
                }
              ],
              "blocks": [
                {
                  "label": "Reuse the merchant workflow",
                  "text": "We should check ONE’s dashboard batch service first and extend it for crypto recipients if it can handle the work."
                },
                {
                  "label": "Execute by funding source",
                  "text": "A payment from ONE custody uses the withdrawal service, while a business-wallet payment uses its authorised signer and adds Flow only when routing is needed."
                },
                {
                  "label": "Retry and reconciliation",
                  "text": "Each batch and recipient needs a stable reference so we can preserve completed payments and distinguish held, failed and unknown results. An uncertain submission needs reconciliation before a retry, and accepting the batch should never imply every recipient has been paid."
                }
              ]
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            },
            {
              "label": "Flow HTTP API",
              "url": "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api"
            }
          ]
        },
        {
          "id": "offramp-service",
          "title": "Auto-conversion",
          "summary": "Connect a receiving address to ONE’s deposit, trading and fiat credit services.",
          "status": "New + extend",
          "tone": "new",
          "blocks": [
            {
              "label": "Account service",
              "text": "ONE controls the receiving address and links deposits to the customer, keeping it distinct from both the Dynamic business wallet and Flow’s transaction-specific address."
            },
            {
              "label": "Execution chain",
              "text": "We follow the deposit through confirmation, ONE’s checks, any sweep, the crypto-to-fiat trade and confirmed fiat credit, keeping the deposit, trade and fee records connected."
            },
            {
              "label": "Conversion terms",
              "text": "We need to agree supported assets and networks, minimums, rate timing, fees, limits and how addresses are managed. A guaranteed fiat amount requires an explicit quote; otherwise, the standing instruction credits the actual proceeds from execution."
            },
            {
              "label": "Exceptions and changes",
              "text": "We need a clear path for unsupported assets, failed trades, suspended instructions and deposits that arrive late. Each deposit keeps the instruction version that applied to it, with fiat credited only after the conversion is confirmed."
            },
            {
              "label": "Dependencies",
              "text": "ONE needs to confirm how we create receiving addresses, receive deposit notifications, execute conversion through Talos or another service, and post the fiat credit. Registering a withdrawal address does not create a receiving address, and Gateway should send compatible settlements here only after the merchant opts in."
            }
          ],
          "operations": [
            {
              "path": "POST /api/v1/crypto-custody/conversion-addresses",
              "technical": "Proposed: provision an approved ONE receiving address and bind the merchant’s standing conversion instruction."
            },
            {
              "path": "GET /api/v1/crypto-custody/conversion-addresses · GET /api/v1/crypto-custody/conversion-addresses/{id}",
              "technical": "Proposed: read the address, supported deposit route, instruction and linked fiat account."
            }
          ],
          "sources": [
            {
              "label": "ONE API reference",
              "url": "https://docs.one.io/"
            },
            {
              "label": "Flow HTTP API",
              "url": "https://www.dynamic.xyz/docs/overview/fireblocks-flow-api"
            }
          ],
          "note": "We still need ONE to confirm the address, trading and ledger APIs that connect this process."
        }
      ],
      "tag": "Proposed changes"
    }
  ]
};
