import type { Metadata } from "next";
import { ReportAccess } from "../../ui/ReportAccess";

export const metadata: Metadata = {
  title: "恢复私人报告",
  description: "使用 Shopify 订单号与购买邮箱恢复 Life Map 私人 PDF 报告。",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReportAccessPage() {
  return <ReportAccess />;
}
