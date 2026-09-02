import { LifeMapApp } from "../../ui/LifeMapApp";
export default async function Page({ params }: { params: Promise<{ productId: string }> }) { const { productId } = await params; return <LifeMapApp initialRoute="product" resourceId={productId} />; }
