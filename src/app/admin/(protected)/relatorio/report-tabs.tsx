import Link from "next/link";

const ABAS = [
  { chave: "vendedores", href: "/admin/relatorio", rotulo: "Vendedores e cartelas" },
  { chave: "cartelas", href: "/admin/relatorio/cartelas", rotulo: "Cartelas distribuídas" },
  { chave: "faixas", href: "/admin/relatorio/faixas", rotulo: "Faixas em ordem numérica" },
] as const;

export function ReportTabs({ active }: { active: (typeof ABAS)[number]["chave"] }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[820px] gap-1 rounded-[11px] border border-border bg-card p-1 shadow-sm">
      {ABAS.map((aba) => (
        <Link
          key={aba.chave}
          href={aba.href}
          className={
            active === aba.chave
              ? "rounded-md bg-vinho px-4 py-2 text-[12.5px] font-extrabold text-bege"
              : "rounded-md px-4 py-2 text-[12.5px] font-extrabold text-muted-foreground"
          }
        >
          {aba.rotulo}
        </Link>
      ))}
    </div>
  );
}
