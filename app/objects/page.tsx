import type { Metadata } from "next";
import { LifeMapApp } from "../ui/LifeMapApp";

export const metadata: Metadata = {
  title: "Symbolic Collection · 象征物商城",
  description: "Optional symbolic objects for daily reflection—materials, design, and meaning without effect claims. 用于日常反思的可选象征物，不作功效保证。",
  alternates: { canonical: "/objects" },
};

export default function Page() { return <LifeMapApp initialRoute="objects" />; }
