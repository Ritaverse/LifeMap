export const REPORT_PRODUCT = {
  productId: "gid://shopify/Product/8295435862085",
  variantId: "gid://shopify/ProductVariant/45796622925893",
  title: "Life Map Full Daily Report",
  price: "2.00",
  currencyCode: "USD",
  storeDomain: "dj4xdu-gb.myshopify.com",
  apiVersion: "2026-04",
} as const;

export const CREATE_REPORT_CART_MUTATION = `mutation CreateReportCart($input: CartInput!) {
  cartCreate(input: $input) {
    cart {
      checkoutUrl
      totalQuantity
      cost {
        totalAmount { amount currencyCode }
      }
    }
    userErrors { field message }
    warnings { code message }
  }
}`;

interface CartResponse {
  data?: {
    cartCreate?: {
      cart?: {
        checkoutUrl: string;
        totalQuantity: number;
        cost: { totalAmount: { amount: string; currencyCode: string } };
      } | null;
      userErrors: Array<{ field?: string[]; message: string }>;
      warnings: Array<{ code?: string; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export interface ReportCheckout {
  checkoutUrl: string;
  amount: string;
  currencyCode: string;
  source: "storefront-api" | "cart-permalink";
}

function validateCheckoutUrl(value: string) {
  const url = new URL(value);
  const allowed = url.protocol === "https:" && (
    url.hostname === REPORT_PRODUCT.storeDomain ||
    url.hostname === "checkout.shopify.com" ||
    url.hostname.endsWith(".myshopify.com")
  );
  if (!allowed) throw new Error("Shopify returned an unexpected checkout address");
  return url.toString();
}

export function reportCartInput() {
  return {
    lines: [{ merchandiseId: REPORT_PRODUCT.variantId, quantity: 1 }],
    attributes: [
      { key: "report_kind", value: "full-daily-reflection" },
      { key: "privacy_mode", value: "local-only" },
    ],
  };
}

export async function createReportCheckout(fetcher: typeof fetch = fetch): Promise<ReportCheckout> {
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.trim();
  if (!token) {
    return {
      checkoutUrl: validateCheckoutUrl(`https://${REPORT_PRODUCT.storeDomain}/cart/${REPORT_PRODUCT.variantId.split("/").at(-1)}:1`),
      amount: REPORT_PRODUCT.price,
      currencyCode: REPORT_PRODUCT.currencyCode,
      source: "cart-permalink",
    };
  }

  const response = await fetcher(`https://${REPORT_PRODUCT.storeDomain}/api/${REPORT_PRODUCT.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-storefront-access-token": token,
    },
    body: JSON.stringify({ query: CREATE_REPORT_CART_MUTATION, variables: { input: reportCartInput() } }),
  });
  const body = await response.json() as CartResponse;
  const payload = body.data?.cartCreate;
  const message = payload?.userErrors?.[0]?.message ?? body.errors?.[0]?.message;
  if (!response.ok || !payload?.cart || message) throw new Error(message ?? "Shopify checkout is temporarily unavailable");

  const total = payload.cart.cost.totalAmount;
  if (payload.cart.totalQuantity !== 1 || total.amount !== REPORT_PRODUCT.price || total.currencyCode !== REPORT_PRODUCT.currencyCode) {
    throw new Error("Shopify returned an unexpected report total");
  }
  return {
    checkoutUrl: validateCheckoutUrl(payload.cart.checkoutUrl),
    amount: total.amount,
    currencyCode: total.currencyCode,
    source: "storefront-api",
  };
}
