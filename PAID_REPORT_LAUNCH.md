# Paid Report Launch

Life Map sells one product: **Life Map Full Personal Report**, a 10-page PDF priced at **USD $2.00**. Product `gid://shopify/Product/8295435862085` and variant `gid://shopify/ProductVariant/45796622925893` are the only accepted IDs.

## Private Delivery Flow

1. The browser renders the finished PDF from deterministic chart facts.
2. `POST /api/report/jobs` validates and stores only the PDF in private R2, then creates an opaque D1 job.
3. The worker creates a Shopify cart containing one variant and `_life_map_report_job_id`. No birth profile, chart JSON, question, or PDF is sent to Shopify.
4. A raw-body HMAC-verified `orders/paid` webhook validates variant, quantity, USD $2 subtotal, allowed tax, zero shipping/discounts/duties, and paid status.
5. The outbox emails a 24-hour fragment token. It exchanges for a 15-minute, three-download session at `/report/access`.
6. Refunds and cancellations revoke tokens and delete the private PDF.

## Infrastructure

- Apply every migration in `drizzle/` to the `DB` D1 binding in filename order.
- Bind a private R2 bucket as `REPORTS`.
- Run the worker scheduled handler regularly and add an R2 lifecycle backstop longer than 32 days.
- Verify a Resend domain and sender, then configure a monitored support inbox.
- Keep all runtime secrets server-only. Generate independent 32+ character token, email-HMAC, rate-limit, and Shopify webhook secrets; `REPORT_PII_KEY` must be a base64-encoded 32-byte key.

## Shopify Setup

Create a Storefront API token for the Life Map sales channel and subscribe these topics to `https://lifemap.fyi/api/webhooks/shopify` using API version `2026-07`:

- `orders/paid`
- `orders/cancelled`
- `refunds/create`

The report variant must remain active, available for sale, non-shipping, and priced at USD $2.00. Discounts must not apply. Tax may be added by Shopify; the $2 product subtotal remains exact.

## Paid-Launch Gate

Leave `PAID_REPORTS_ENABLED=false` until the site is public and all controls pass. Set these attestations only after direct verification:

- `REPORT_PUBLIC_ACCESS_CONFIRMED=true`
- `REPORT_WEBHOOKS_CONFIGURED=true`
- `REPORT_CLEANUP_CONFIGURED=true`
- `REPORT_POLICIES_CONFIRMED=true`
- `REPORT_TEST_ORDERS_ONLY=false`

Then run one Shopify test purchase and verify: checkout → paid webhook → one email → download → recovery → cancellation → refund → expired cleanup. Confirm duplicate webhooks send no duplicate email and invalid amount, variant, currency, signature, or unpaid orders create no entitlement. Enable `PAID_REPORTS_ENABLED=true` last; `/api/report/readiness` must still return `available: true` before the UI opens checkout.

## Retention

- No checkout created: delete after 24 hours.
- Shopify checkout created: retain up to 32 days, covering Shopify’s 30-day cart lifetime plus webhook grace.
- Paid: retain for 30 days from payment.
- Terminal job metadata: delete after 90 days; webhook/outbox metadata after 30 days.
