import { LifeMapApp } from "../../ui/LifeMapApp";
export default async function Page({ params }: { params: Promise<{ domain: string }> }) { const { domain } = await params; return <LifeMapApp initialRoute="domain" resourceId={domain} />; }
