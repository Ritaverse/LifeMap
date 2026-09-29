import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { products } from "../../lib/data";
import { LifeMapApp } from "../../ui/LifeMapApp";

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }): Promise<Metadata> {
  const { productId } = await params;
  const product = products.find((item) => item.id === productId || item.slug === productId);
  if (!product) notFound();
  return {
    title: `${product.nameZh} · ${product.nameEn}`,
    description: `${product.nameEn} / ${product.nameZh}. An optional symbolic object for daily reflection; no effect or outcome is promised. ${product.shortDescription}`,
    alternates: { canonical: `/objects/${product.slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!products.some((item) => item.id === productId || item.slug === productId)) notFound();
  return <LifeMapApp initialRoute="product" resourceId={productId} />;
}
