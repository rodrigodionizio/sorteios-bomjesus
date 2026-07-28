import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];
const PUBLIC_VENDEDOR_PATHS = ["/vendedor/entrar", "/vendedor/cadastro"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.some((p) =>
    pathname.startsWith(p),
  );

  if (isAdminRoute && !isPublicAdminPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/admin/login" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Mesmo padrão do bloco de /admin acima — só decide "está autenticado?".
  // Se a conta não tiver `vendedores.user_id` vinculado ainda, quem decide
  // isso é o layout de `/vendedor/(protected)`, não o proxy (ver 06 e
  // 14-roadmap-implementacoes-novas.md, C.10).
  const isVendedorRoute = pathname.startsWith("/vendedor");
  const isPublicVendedorPath = PUBLIC_VENDEDOR_PATHS.some((p) =>
    pathname.startsWith(p),
  );

  if (isVendedorRoute && !isPublicVendedorPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/vendedor/entrar";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (
    (pathname === "/vendedor/entrar" || pathname === "/vendedor/cadastro") &&
    user
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/vendedor";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
