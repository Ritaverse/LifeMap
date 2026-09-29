/** Cloudflare Worker entry point for Life Map. */
import handler from "vinext/server/app-router-entry";
import { handleReportRequest, runReportMaintenance } from "./report-service.ts";
import type { ReportWorkerEnv } from "./report-store.ts";

type Env = ReportWorkerEnv;

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const reportResponse = await handleReportRequest(request, env, ctx);
    if (reportResponse) return applyResponseHeaders(request, reportResponse);
    const response = await handler.fetch(request, env, ctx);
    return applyResponseHeaders(request, response);
  },
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReportMaintenance(env));
  },
};

const PERSONALIZED_ROUTES = [
  "/onboarding",
  "/generating",
  "/today",
  "/insights",
  "/life-map",
  "/ask",
  "/iching",
  "/timing",
  "/report",
  "/me",
] as const;

function isPersonalizedRoute(pathname: string) {
  return PERSONALIZED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function contentSecurityPolicy(url: URL) {
  const localDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  const scriptSources = localDevelopment
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";
  const connectSources = [
    "'self'",
    "https://geocoding-api.open-meteo.com",
    ...(localDevelopment ? ["ws:", "wss:"] : []),
  ].join(" ");

  return [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources}`,
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://dj4xdu-gb.myshopify.com https://checkout.shopify.com",
    ...(url.protocol === "https:" ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

function applyResponseHeaders(request: Request, response: Response) {
  if (response.status === 101) return response;

  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", contentSecurityPolicy(url));
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-DNS-Prefetch-Control", "off");
  headers.set("X-Frame-Options", "DENY");

  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000");
  }

  if (isPersonalizedRoute(url.pathname)) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default worker;
