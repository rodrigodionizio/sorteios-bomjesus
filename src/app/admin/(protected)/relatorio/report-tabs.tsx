import Link from "next/link";

export function ReportTabs({ active }: { active: "vendedores" | "cartelas" }) {
  return (
    <div className="no-print mx-auto mb-4 flex max-w-[820px] gap-1 rounded-[11px] border border-border bg-card p-1 shadow-sm">
      <Link
        href="/admin/relatorio"
        className={
          active === "vendedores"
            ? "rounded-md bg-vinho px-4 py-2 text-[12.5px] font-extrabold text-bege"
            : "rounded-md px-4 py-2 text-[12.5px] font-extrabold text-muted-foreground"
        }
      >
        Vendedores e cartelas
      </Link>
      <Link
        href="/admin/relatorio/cartelas"
        className={
          active === "cartelas"
            ? "rounded-md bg-vinho px-4 py-2 text-[12.5px] font-extrabold text-bege"
            : "rounded-md px-4 py-2 text-[12.5px] font-extrabold text-muted-foreground"
        }
      >
        Cartelas distribuídas
      </Link>
    </div>
  );
}
