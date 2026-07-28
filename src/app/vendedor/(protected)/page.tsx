import { ClockIcon, CheckIcon, XIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatInt, formatDate } from "@/lib/format";
import { SolicitarBaixaForm } from "./solicitar-baixa-form";

const FORMA_LABEL: Record<string, string> = {
  dinheiro: "dinheiro",
  pix: "Pix",
  transferencia: "transferência",
};

const STATUS_LABEL: Record<
  string,
  { label: string; Icon: typeof ClockIcon; className: string }
> = {
  pendente: { label: "Pendente", Icon: ClockIcon, className: "bg-dourado/15 text-dourado-deep" },
  aprovada: { label: "Aprovada", Icon: CheckIcon, className: "bg-good-bg text-good" },
  rejeitada: { label: "Rejeitada", Icon: XIcon, className: "bg-bad-bg text-bad" },
};

export default async function VendedorDashboardPage() {
  const supabase = await createClient();

  const { data: lotes } = await supabase
    .from("vw_lote_progresso")
    .select("*")
    .order("numero_inicial");

  const { data: solicitacoes } = await supabase
    .from("solicitacoes_baixa")
    .select("*")
    .order("solicitado_em", { ascending: false })
    .limit(20);

  const totalReservado = (lotes ?? []).reduce((s, l) => s + l.quantidade, 0);
  const totalConfirmado = (lotes ?? []).reduce((s, l) => s + l.confirmado, 0);
  const totalSolicitado = (lotes ?? []).reduce((s, l) => s + l.solicitado_pendente, 0);

  return (
    <>
      <h1 className="mb-1 text-2xl font-black">Meu painel</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Acompanhe seus lotes e solicite a baixa do que já vendeu.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <Kpi label="reservadas" value={totalReservado} />
        <Kpi label="confirmadas" value={totalConfirmado} gold />
        <Kpi label="solicitadas" value={totalSolicitado} />
      </div>

      <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-black">Meus lotes</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Faixas de cartelas que você recebeu para vender.
        </p>
        <div className="flex flex-col gap-2.5">
          {(lotes ?? []).map((l) => {
            const pct = l.quantidade > 0 ? Math.round((l.confirmado / l.quantidade) * 100) : 0;
            return (
              <div
                key={l.lote_id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2.5 last:border-none last:pb-0"
              >
                <div>
                  <div className="font-bold tabular-nums">
                    {l.numero_inicial === l.numero_final
                      ? l.numero_inicial
                      : `${l.numero_inicial} – ${l.numero_final}`}
                  </div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {l.tipo} · {l.sorteio_nome}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                    <span
                      className="block h-full bg-dourado"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-[12px] font-bold text-muted-foreground">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
          {(lotes ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Você ainda não tem cartelas reservadas.
            </p>
          ) : null}
        </div>
      </section>

      {(lotes ?? []).length > 0 ? (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 text-base font-black">Solicitar baixa</h2>
          <p className="mb-4 text-[13px] text-muted-foreground">
            Registre o que você já vendeu — a coordenação confirma depois de
            conferir o pagamento.
          </p>
          <SolicitarBaixaForm lotes={lotes ?? []} />
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-base font-black">Minhas solicitações</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Acompanhe o status de cada pedido de baixa.
        </p>
        <div className="flex flex-col gap-2">
          {(solicitacoes ?? []).map((s) => {
            const status = STATUS_LABEL[s.status];
            return (
              <div key={s.id} className="rounded-xl border border-border p-3.5">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-bold tabular-nums">
                    {s.numero_inicial === s.numero_final
                      ? s.numero_inicial
                      : `${s.numero_inicial} – ${s.numero_final}`}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.className}`}
                  >
                    <status.Icon className="size-3" /> {status.label}
                  </span>
                </div>
                <div className="text-[11.5px] text-muted-foreground">
                  {FORMA_LABEL[s.forma_alegada]} · enviada em {formatDate(s.solicitado_em)}
                </div>
                {s.status === "rejeitada" && s.motivo_rejeicao ? (
                  <div className="mt-1.5 rounded-md bg-bad-bg px-2.5 py-1.5 text-xs text-bad">
                    Motivo: {s.motivo_rejeicao}
                  </div>
                ) : null}
              </div>
            );
          })}
          {(solicitacoes ?? []).length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma solicitação enviada ainda.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value, gold }: { label: string; value: number; gold?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-3 text-center shadow-sm">
      <div className={`text-lg font-black tabular-nums ${gold ? "text-dourado-deep" : "text-vinho-deep"}`}>
        {formatInt(value)}
      </div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
