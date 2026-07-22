import { AdminPageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { ImportarForm } from "./importar-form";

export default function ImportarPage() {
  return (
    <>
      <AdminPageHeader
        breadcrumb="Cartelas / Importar planilha"
        title="Importar planilha"
        right={
          <Button
            variant="outline"
            className="border-border font-bold"
            render={<a href="/templates/planilha-modelo-contingencia.xlsx" download />}
          >
            ↓ Baixar modelo (.xlsx)
          </Button>
        }
      />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Contingência offline → banco</h2>
        <p className="mb-4.5 max-w-[62ch] text-[13.5px] text-muted-foreground">
          Use quando um voluntário registrou vendas na planilha em campo. Cada
          linha passa pelas mesmas validações do sistema antes de ser
          gravada.
        </p>
        <ImportarForm />
      </section>
    </>
  );
}
