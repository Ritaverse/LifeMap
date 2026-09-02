import { LifeMapApp } from "../../ui/LifeMapApp";
export default async function Page({ params }: { params: Promise<{ insightId: string }> }) { const { insightId } = await params; return <LifeMapApp initialRoute="insight" resourceId={insightId} />; }
