import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: config.siteName,
    short_name: "Confession Post",
    description: "A private post office for Zuraiz and Qunoot.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f3ecdd",
    theme_color: "#f3ecdd",
    orientation: "portrait-primary",
    categories: ["lifestyle", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
