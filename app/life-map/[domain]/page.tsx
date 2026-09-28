import { notFound } from "next/navigation";
import { LifeMapApp } from "../../ui/LifeMapApp";

const domainIds = new Set(["identity", "career", "wealth", "love", "family", "relationships", "creativity", "inner-life"]);

export default async function Page({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!domainIds.has(domain)) notFound();
  return <LifeMapApp initialRoute="domain" resourceId={domain} />;
}
