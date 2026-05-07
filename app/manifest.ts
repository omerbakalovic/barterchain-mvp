import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BarterChain MVP",
    short_name: "BarterChain",
    description:
      "A multi-hop barter platform that helps unused goods move through circular trade chains.",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf8",
    theme_color: "#111827",
    lang: "en",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

