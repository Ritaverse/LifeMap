export type ReportProductKind = "daily" | "detailed";

const SHOPIFY_STORE = {
  domain: "dj4xdu-gb.myshopify.com",
  apiVersion: "2026-04",
} as const;

export const REPORT_PRODUCTS = {
  daily: {
    kind: "daily",
    reportKind: "daily-reflection",
    productId: "gid://shopify/Product/8296521891909",
    variantId: "gid://shopify/ProductVariant/45812444725317",
    title: "Life Map Daily Report",
    price: "1.99",
    currencyCode: "USD",
    pages: 1,
  },
  detailed: {
    kind: "detailed",
    reportKind: "detailed-ten-page-reflection",
    productId: "gid://shopify/Product/8295435862085",
    variantId: "gid://shopify/ProductVariant/45796622925893",
    title: "Life Map 10-Page Detailed Report",
    price: "19.99",
    currencyCode: "USD",
    pages: 10,
  },
} as const satisfies Record<ReportProductKind, {
  kind: ReportProductKind;
  reportKind: string;
  productId: string;
  variantId: string;
  title: string;
  price: string;
  currencyCode: "USD";
  pages: number;
}>;

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
  kind: ReportProductKind;
  checkoutUrl: string;
  amount: string;
  currencyCode: string;
  source: "storefront-api" | "cart-permalink";
}

function validateCheckoutUrl(value: string) {
  const url = new URL(value);
  const allowed = url.protocol === "https:" && (
    url.hostname === SHOPIFY_STORE.domain ||
    url.hostname === "checkout.shopify.com" ||
    url.hostname.endsWith(".myshopify.com")
  );
  if (!allowed) throw new Error("Shopify returned an unexpected checkout address");
  return url.toString();
}

export function reportCartInput(kind: ReportProductKind) {
  const product = REPORT_PRODUCTS[kind];
  return {
    lines: [{ merchandiseId: product.variantId, quantity: 1 }],
    attributes: [
      { key: "report_kind", value: product.reportKind },
      { key: "privacy_mode", value: "local-only" },
    ],
  };
}

export async function createReportCheckout(kind: ReportProductKind, fetcher: typeof fetch = fetch): Promise<ReportCheckout> {
  const product = REPORT_PRODUCTS[kind];
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.trim();
  if (!token) {
    return {
      kind,
      checkoutUrl: validateCheckoutUrl(`https://${SHOPIFY_STORE.domain}/cart/${product.variantId.split("/").at(-1)}:1`),
      amount: product.price,
      currencyCode: product.currencyCode,
      source: "cart-permalink",
    };
  }

  const response = await fetcher(`https://${SHOPIFY_STORE.domain}/api/${SHOPIFY_STORE.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shopify-storefront-access-token": token,
    },
    body: JSON.stringify({ query: CREATE_REPORT_CART_MUTATION, variables: { input: reportCartInput(kind) } }),
  });
  const body = await response.json() as CartResponse;
  const payload = body.data?.cartCreate;
  const message = payload?.userErrors?.[0]?.message ?? body.errors?.[0]?.message;
  if (!response.ok || !payload?.cart || message) throw new Error(message ?? "Shopify checkout is temporarily unavailable");

  const total = payload.cart.cost.totalAmount;
  if (payload.cart.totalQuantity !== 1 || total.amount !== product.price || total.currencyCode !== product.currencyCode) {
    throw new Error("Shopify returned an unexpected report total");
  }
  return {
    kind,
    checkoutUrl: validateCheckoutUrl(payload.cart.checkoutUrl),
    amount: total.amount,
    currencyCode: total.currencyCode,
    source: "storefront-api",
  };
}
