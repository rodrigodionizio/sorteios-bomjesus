import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Compatibilidade com os links antigos do placar.
  //
  // Até a landing entrar, a raiz do site ERA o placar, e escolher um sorteio
  // específico era `/?sorteio=<uuid>`. Esse link já circulou em grupo de
  // WhatsApp; quebrá-lo no meio de uma campanha seria um retrocesso visível.
  // 308 (e não 307) porque a mudança é permanente e preserva o método.
  //
  // Fazer isso aqui, e não dentro da página, é o que permite que `/` continue
  // sem ler `searchParams` — o que a manteria dinâmica e anularia o ISR dela.
  if (pathname === "/" && searchParams.has("sorteio")) {
    const sorteioId = searchParams.get("sorteio");
    if (sorteioId) {
      const url = request.nextUrl.clone();
      url.pathname = `/placar/${sorteioId}`;
      url.search = "";
      return NextResponse.redirect(url, 308);
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
