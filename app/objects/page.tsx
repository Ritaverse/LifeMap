import type { Metadata } from "next";
import { LifeMapApp } from "../ui/LifeMapApp";

export const metadata: Metadata = {
  title: "象征物商城",
  alternates: { canonical: "/objects" },
};

export default function Page() { return <LifeMapApp initialRoute="objects" />; }
