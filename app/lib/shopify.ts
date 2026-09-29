import { FULL_REPORT_PRODUCT, REPORT_SCHEMA_VERSION } from "./report-product.ts";

export interface ReportLaunchReadiness {
  available: boolean;
}

export interface ReportJobReceipt {
  jobId: string;
  capability: string;
  expiresAt: string;
}

export interface ReportCheckout {
  checkoutUrl: string;
  amount: typeof FULL_REPORT_PRODUCT.price;
  currencyCode: typeof FULL_REPORT_PRODUCT.currencyCode;
}

interface ApiErrorBody {
  error?: string;
}

async function apiError(response: Response, fallback: string) {
  try {
    const body = await response.json() as ApiErrorBody;
    return new Error(body.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function getReportLaunchReadiness(fetcher: typeof fetch = fetch): Promise<ReportLaunchReadiness> {
  const response = await fetcher("/api/report/readiness", {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return { available: false };
  const body = await response.json() as Partial<ReportLaunchReadiness>;
  return { available: body.available === true };
}

export async function createPrivateReportJob(
  pdf: Uint8Array,
  fetcher: typeof fetch = fetch,
): Promise<ReportJobReceipt> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(pdf));
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const response = await fetcher("/api/report/jobs", {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-life-map-pdf-sha256": sha256,
      "x-life-map-pdf-pages": String(FULL_REPORT_PRODUCT.pages),
      "x-life-map-report-schema": REPORT_SCHEMA_VERSION,
    },
    body: new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
  });
  if (!response.ok) throw await apiError(response, "私人报告暂时无法安全保存，请稍后重试。");
  return response.json() as Promise<ReportJobReceipt>;
}

export async function createReportCheckout(
  job: Pick<ReportJobReceipt, "jobId" | "capability">,
  fetcher: typeof fetch = fetch,
): Promise<ReportCheckout> {
  const response = await fetcher(`/api/report/jobs/${encodeURIComponent(job.jobId)}/checkout`, {
    method: "POST",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${job.capability}`,
    },
  });
  if (!response.ok) throw await apiError(response, "Shopify 结账暂时不可用，请稍后重试。");
  return response.json() as Promise<ReportCheckout>;
}

export async function requestReportAccess(
  orderNumber: string,
  email: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher("/api/report/access/request", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber, email }),
  });
  if (!response.ok) throw await apiError(response, "暂时无法提交恢复请求，请稍后重试。");
}

export async function exchangeReportAccessToken(token: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher("/api/report/access/exchange", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) throw await apiError(response, "这个下载链接无效或已经过期。");
}
