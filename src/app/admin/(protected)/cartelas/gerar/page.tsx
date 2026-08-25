import Link from "next/link";
import { TriangleAlertIcon, PrinterIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSorteioAtual } from "@/lib/sorteio-atual";
import { formatInt, formatDateTime } from "@/lib/format";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SorteioSwitcher } from "@/components/admin/sorteio-switcher";
import { Button } from "@/components/ui/button";
import { montarBrCode, montarTxid } from "@/lib/pix";
import { GerarForm } from "./gerar-form";
import { ApagarForm } from "./apagar-form";

export default async function GerarCartelasPage() {
  const supabase = await createClient();
  const { sorteios, atual } = await getSorteioAtual();

  if (!atual) {
    return (
      <>
        <AdminPageHeader breadcrumb="Cartelas / Gerar" title="Gerar cartelas" />
        <p className="text-muted-foreground">Nenhum sorteio cadastrado.</p>
      </>
    );
  }

  const [{ data: cartelas, count }, { data: chave }] = await Promise.all([
    supabase
      .from("cartelas")
      .select("numero, quadros, codigo_verificacao, gerada_em", { count: "exact" })
      .eq("sorteio_id", atual.id)
      .order("numero", { ascending: false })
      .limit(1),
    atual.pix_chave_id
      ? supabase.from("pix_chaves").select("*").eq("id", atual.pix_chave_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const jaGeradas = count ?? 0;
  const totalCartelas = atual.cartela_max - atual.cartela_min + 1;
  const quadrosAtuais = cartelas?.[0]?.quadros ?? null;
  const maiorGerada = cartelas?.[0]?.numero ?? null;
  // Começo natural da próxima leva: logo depois da última cartela gerada.
  const proximaLivre =
    maiorGerada !== null ? Math.min(maiorGerada + 1, atual.cartela_max) : atual.cartela_min;

  // "Copia e cola" da primeira cartela: serve de conferência aqui e é o que
  // a coordenação manda por WhatsApp para quem vai pagar de longe. No papel
  // ele não entra — ninguém digita 130 caracteres de uma folha impressa.
  const exemploBrCode = chave
    ? montarBrCode({
        chave: chave.chave,
        nomeRecebedor: chave.nome_recebedor,
        cidade: chave.cidade,
        txid: montarTxid(chave.mensagem, atual.cartela_min),
      })
    : null;

  return (
    <>
      <AdminPageHeader
        breadcrumb="Cartelas / Gerar"
        title="Gerar cartelas"
        right={<SorteioSwitcher sorteios={sorteios} currentId={atual.id} />}
      />

      <section className="mb-4.5 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">
          {atual.nome} — cartelas {atual.cartela_min} a {atual.cartela_max}
        </h2>
        <p className="mb-4.5 max-w-[70ch] text-[13.5px] text-muted-foreground">
          A geração cria uma cartela para cada número da faixa, com 24 dezenas
          sorteadas dentro da faixa de cada coluna do B-I-N-G-O. Gere{" "}
          <strong className="text-foreground">antes de distribuir</strong>: as
          cartelas são impressas com os números já fixados.
        </p>

        {jaGeradas > 0 ? (
          <div className="mb-4.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-good-bg px-4 py-3">
            <span className="text-[13.5px] font-bold text-good">
              {formatInt(jaGeradas)} de {formatInt(totalCartelas)} cartelas geradas
              {quadrosAtuais ? ` · ${quadrosAtuais} quadro(s) cada` : ""}
              {cartelas?.[0] ? ` · última em ${formatDateTime(cartelas[0].gerada_em)}` : ""}
            </span>
            <Button
              nativeButton={false}
              render={<Link href="/admin/cartelas/imprimir" />}
              className="h-9 gap-1.5 bg-vinho px-4 text-[13px] font-extrabold text-bege hover:bg-[var(--brand-vinho-deep)]"
            >
              <PrinterIcon className="size-4" /> Imprimir cartelas
            </Button>
          </div>
        ) : null}

        <GerarForm
          sorteioId={atual.id}
          cartelaMin={atual.cartela_min}
          cartelaMax={atual.cartela_max}
          proximaLivre={proximaLivre}
        />

        {jaGeradas > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <ApagarForm
              sorteioId={atual.id}
              cartelaMin={atual.cartela_min}
              cartelaMax={atual.cartela_max}
            />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-1 text-[17px] font-black">Pagamento impresso na cartela</h2>
        {chave ? (
          <>
            <p className="mb-4 max-w-[70ch] text-[13.5px] text-muted-foreground">
              O QR sai <strong className="text-foreground">sem valor</strong>: quem paga digita o
              total, para levar várias cartelas num pagamento só. A referência
              muda por cartela — é ela que identifica o pagamento no extrato.
            </p>
            <dl className="mb-4 grid gap-1.5 text-[13.5px] sm:grid-cols-[auto_1fr] sm:gap-x-4">
              <dt className="font-bold">Chave:</dt>
              <dd className="font-mono text-[12.5px]">{chave.chave}</dd>
              <dt className="font-bold">Recebedor:</dt>
              <dd>
                {chave.nome_recebedor} · {chave.cidade}
              </dd>
              <dt className="font-bold">Referência da 1ª cartela:</dt>
              <dd className="font-mono text-[12.5px]">
                {montarTxid(chave.mensagem, atual.cartela_min)}
              </dd>
            </dl>
            <div>
              <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                Pix copia e cola — cartela {atual.cartela_min}
              </div>
              <code className="block break-all rounded-lg bg-secondary px-3.5 py-3 font-mono text-[11px] leading-relaxed">
                {exemploBrCode}
              </code>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg bg-info-bg px-4 py-3 text-[13px] font-medium text-info">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              Este sorteio ainda não tem chave Pix vinculada — as cartelas serão
              impressas sem QR de pagamento. Cadastre em{" "}
              <Link href="/admin/pix" className="font-bold underline">
                Chaves Pix
              </Link>{" "}
              e vincule na tela de{" "}
              <Link href="/admin/sorteios" className="font-bold underline">
                Sorteios
              </Link>
              .
            </span>
          </div>
        )}
      </section>
    </>
  );
}
