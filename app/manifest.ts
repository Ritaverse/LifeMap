import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life Map · 人生地图",
    short_name: "Life Map",
    description: "融合东方命理与西方占星的个人反思工具。",
    start_url: "/",
    display: "standalone",
    background_color: "#160e2f",
    theme_color: "#160e2f",
    lang: "zh-CN",
    categories: ["lifestyle", "education"],
  };
}
