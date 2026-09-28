import { notFound } from "next/navigation";
import { LifeMapApp } from "../../ui/LifeMapApp";

const insightIds = new Set([
  "calculated-today",
  "calculated-identity",
  "calculated-career",
  "calculated-wealth",
  "calculated-love",
  "calculated-family",
  "calculated-relationships",
  "calculated-creativity",
  "calculated-inner-life",
]);

export default async function Page({ params }: { params: Promise<{ insightId: string }> }) {
  const { insightId } = await params;
  if (!insightIds.has(insightId)) notFound();
  return <LifeMapApp initialRoute="insight" resourceId={insightId} />;
}
