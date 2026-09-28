import type { ReactNode } from "react";
import { privateRouteMetadata } from "../lib/private-route-metadata";

export const metadata = privateRouteMetadata;

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
