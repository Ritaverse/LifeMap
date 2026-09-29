import type { Metadata } from "next";
import { ReportAccess } from "../../ui/ReportAccess";

export const metadata: Metadata = {
  title: "Recover Private Report · 恢复私人报告",
  description: "Recover a private Life Map PDF with the Shopify order number and purchase email. 使用订单号与购买邮箱恢复报告。",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReportAccessPage() {
  return <ReportAccess />;
}
