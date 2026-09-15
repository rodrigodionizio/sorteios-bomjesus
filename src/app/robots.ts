import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas de aplicação, não de conteúdo. `/admin` já era barrado; as
      // outras entraram junto com a landing, que passou a linká-las — antes
      // ninguém chegava nelas por navegação, agora chega (e o robô também).
      // `/diretoria` fica de fora do índice por ser porta de acesso restrito:
      // indexá-la não ajuda ninguém e convida a tentativa de código.
      disallow: ["/admin", "/vendedor", "/diretoria", "/auth"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
