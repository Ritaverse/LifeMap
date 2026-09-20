import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_REPORT_CART_MUTATION,
  createReportCheckout,
  reportCartInput,
  REPORT_PRODUCT,
} from "../app/lib/shopify.ts";

test("report cart contains only a product, quantity, and non-sensitive labels", () => {
  const input = reportCartInput();
  const serialized = JSON.stringify(input);
  assert.equal(input.lines[0].merchandiseId, REPORT_PRODUCT.variantId);
  assert.equal(input.lines[0].quantity, 1);
  assert.doesNotMatch(serialized, /birth|name|date|time|location|pillar|profile/i);
  assert.match(CREATE_REPORT_CART_MUTATION, /cartCreate/);
  assert.doesNotMatch(CREATE_REPORT_CART_MUTATION, /buyerIdentity|email|phone/);
});

test("checkout client verifies the live amount before returning a Shopify URL", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = "public-test-token";
  let requestBody;
  try {
    const checkout = await createReportCheckout(async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ data: { cartCreate: {
        cart: { checkoutUrl: "https://dj4xdu-gb.myshopify.com/checkouts/example", totalQuantity: 1, cost: { totalAmount: { amount: "2.00", currencyCode: "USD" } } },
        userErrors: [], warnings: [],
      } } }), { status: 200, headers: { "content-type": "application/json" } });
    });
    assert.equal(checkout.amount, "2.00");
    assert.equal(checkout.currencyCode, "USD");
    assert.equal(checkout.source, "storefront-api");
    assert.deepEqual(requestBody.variables.input, reportCartInput());
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
    else process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});

test("checkout client rejects price drift and unsafe redirect hosts", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = "public-test-token";
  try {
    await assert.rejects(() => createReportCheckout(async () => new Response(JSON.stringify({ data: { cartCreate: {
      cart: { checkoutUrl: "https://example.com/pay", totalQuantity: 1, cost: { totalAmount: { amount: "3.00", currencyCode: "USD" } } },
      userErrors: [], warnings: [],
    } } }), { status: 200, headers: { "content-type": "application/json" } })), /unexpected report total/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
    else process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});

test("protected-store fallback is a Shopify cart permalink", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  try {
    const checkout = await createReportCheckout();
    assert.equal(checkout.source, "cart-permalink");
    assert.match(checkout.checkoutUrl, /^https:\/\/dj4xdu-gb\.myshopify\.com\/cart\/45796622925893:1/);
  } finally {
    if (previous !== undefined) process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});
