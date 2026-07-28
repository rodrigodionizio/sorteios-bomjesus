"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/admin/(protected)/actions";

const NAV_SECTIONS = [
  {
    label: "Geral",
    items: [{ href: "/admin", label: "Visão geral" }],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/admin/sorteios", label: "Sorteios" },
      { href: "/admin/vendedores", label: "Vendedores" },
      { href: "/admin/usuarios", label: "Usuários" },
    ],
  },
  {
    label: "Cartelas",
    items: [
      { href: "/admin/reservar", label: "Reservar cartelas" },
      { href: "/admin/baixa", label: "Dar baixa" },
      { href: "/admin/importar", label: "Importar planilha" },
    ],
  },
  {
    label: "Sorteio",
    items: [
      { href: "/admin/apuracao", label: "Apuração" },
      { href: "/", label: "Placar ao vivo" },
      { href: "/admin/relatorio", label: "Relatório" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[240px] shrink-0 flex-col gap-6 bg-gradient-to-b from-vinho to-vinho-deep p-4 text-bege print:hidden">
      <div className="flex items-center gap-2.5 px-1.5">
        <Image
          src="/brand/logo-simbolo-mono-claro.svg"
          alt=""
          width={28}
          height={28}
          className="shrink-0"
        />
        <div>
          <div className="text-[15.5px] font-black leading-tight">
            Sorteios
          </div>
          <div className="text-[11px] text-bege/65">Paróquia Bom Jesus</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="mb-1 mt-3.5 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-bege/50 first:mt-0">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? false
                  : item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.href === "/" ? "_blank" : undefined}
                  className={cn(
                    "block rounded-lg px-2.5 py-2 text-sm font-semibold text-bege/85 hover:bg-bege/10",
                    isActive && "bg-bege font-bold text-vinho-deep hover:bg-bege",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2.5 px-1.5">
        <Link
          href="/admin/conta"
          className={cn(
            "text-[13px] font-semibold text-bege/70 hover:text-bege",
            pathname === "/admin/conta" && "text-bege",
          )}
        >
          Minha conta
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-[13px] font-semibold text-bege/60 hover:text-bege"
          >
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
