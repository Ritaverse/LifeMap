import assert from "node:assert/strict";
import test from "node:test";
import {
  CREATE_REPORT_CART_MUTATION,
  createReportCheckout,
  reportCartInput,
  REPORT_PRODUCTS,
} from "../app/lib/shopify.ts";

test("each report cart contains only its product, quantity, and non-sensitive labels", () => {
  for (const kind of ["daily", "detailed"]) {
    const input = reportCartInput(kind);
    const serialized = JSON.stringify(input);
    assert.equal(input.lines[0].merchandiseId, REPORT_PRODUCTS[kind].variantId);
    assert.equal(input.lines[0].quantity, 1);
    assert.equal(input.attributes[0].value, REPORT_PRODUCTS[kind].reportKind);
    assert.doesNotMatch(serialized, /birth|name|location|pillar|profile/i);
  }
  assert.match(CREATE_REPORT_CART_MUTATION, /cartCreate/);
  assert.doesNotMatch(CREATE_REPORT_CART_MUTATION, /buyerIdentity|email|phone/);
});

test("checkout client verifies both live report amounts before returning Shopify URLs", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = "public-test-token";
  try {
    for (const kind of ["daily", "detailed"]) {
      let requestBody;
      const product = REPORT_PRODUCTS[kind];
      const checkout = await createReportCheckout(kind, async (_url, init) => {
        requestBody = JSON.parse(String(init?.body));
        return new Response(JSON.stringify({ data: { cartCreate: {
          cart: { checkoutUrl: `https://dj4xdu-gb.myshopify.com/checkouts/${kind}`, totalQuantity: 1, cost: { totalAmount: { amount: product.price, currencyCode: "USD" } } },
          userErrors: [], warnings: [],
        } } }), { status: 200, headers: { "content-type": "application/json" } });
      });
      assert.equal(checkout.kind, kind);
      assert.equal(checkout.amount, product.price);
      assert.equal(checkout.currencyCode, "USD");
      assert.equal(checkout.source, "storefront-api");
      assert.deepEqual(requestBody.variables.input, reportCartInput(kind));
    }
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
    else process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});

test("checkout client rejects price drift and unsafe redirect hosts", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = "public-test-token";
  try {
    await assert.rejects(() => createReportCheckout("daily", async () => new Response(JSON.stringify({ data: { cartCreate: {
      cart: { checkoutUrl: "https://dj4xdu-gb.myshopify.com/checkouts/example", totalQuantity: 1, cost: { totalAmount: { amount: "2.99", currencyCode: "USD" } } },
      userErrors: [], warnings: [],
    } } }), { status: 200, headers: { "content-type": "application/json" } })), /unexpected report total/);

    await assert.rejects(() => createReportCheckout("detailed", async () => new Response(JSON.stringify({ data: { cartCreate: {
      cart: { checkoutUrl: "https://example.com/pay", totalQuantity: 1, cost: { totalAmount: { amount: "19.99", currencyCode: "USD" } } },
      userErrors: [], warnings: [],
    } } }), { status: 200, headers: { "content-type": "application/json" } })), /unexpected checkout address/);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
    else process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});

test("protected-store fallbacks use the correct Shopify cart permalink", async () => {
  const previous = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  delete process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  try {
    const daily = await createReportCheckout("daily");
    const detailed = await createReportCheckout("detailed");
    assert.equal(daily.source, "cart-permalink");
    assert.match(daily.checkoutUrl, /^https:\/\/dj4xdu-gb\.myshopify\.com\/cart\/45812444725317:1/);
    assert.match(detailed.checkoutUrl, /^https:\/\/dj4xdu-gb\.myshopify\.com\/cart\/45796622925893:1/);
  } finally {
    if (previous !== undefined) process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN = previous;
  }
});
