import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fitness Buddy AI",
    short_name: "Fitness Buddy",
    description: "Educational fitness and meal planning.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0c14",
    theme_color: "#0a0c14",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
