"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/app/admin/(protected)/actions";

export function VendedorHeader({
  nome,
  cargo,
}: {
  nome: string;
  cargo: string | null;
}) {
  const pathname = usePathname();

  return (
    <header className="bg-gradient-to-r from-vinho to-vinho-deep px-4 py-3.5 text-bege sm:px-6">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/brand/logo-simbolo-mono-claro.svg"
            alt=""
            width={26}
            height={26}
            className="shrink-0"
          />
          <div>
            <div className="text-sm font-black leading-tight">{nome}</div>
            <div className="text-[11px] text-bege/65">{cargo ?? "Vendedor(a)"}</div>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-[13px] font-bold">
          <Link
            href="/vendedor"
            className={cn(
              "text-bege/85 hover:text-bege",
              pathname === "/vendedor" && "text-bege underline underline-offset-4",
            )}
          >
            Painel
          </Link>
          <Link
            href="/vendedor/conta"
            className={cn(
              "text-bege/85 hover:text-bege",
              pathname === "/vendedor/conta" && "text-bege underline underline-offset-4",
            )}
          >
            Minha conta
          </Link>
          <form action={logout}>
            <button type="submit" className="text-bege/70 hover:text-bege">
              Sair
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
