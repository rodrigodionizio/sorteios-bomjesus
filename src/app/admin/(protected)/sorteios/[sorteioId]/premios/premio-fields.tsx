"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORIAS, DESCRICAO_CATEGORIA, ROTULO_CATEGORIA } from "@/lib/premios";
import type { CategoriaPremio } from "@/lib/premios";

export type ValoresPremio = {
  categoria: CategoriaPremio;
  titulo: string;
  descricao: string;
  valor: string;
  quantidade: string;
  exibir_publico: boolean;
};

export const PREMIO_VAZIO: ValoresPremio = {
  categoria: "cartela_sorteada",
  titulo: "",
  descricao: "",
  valor: "",
  quantidade: "1",
  exibir_publico: true,
};

/**
 * Os campos do prêmio, compartilhados entre o formulário de cadastro e o
 * diálogo de edição — são exatamente os mesmos campos, e duplicá-los seria
 * garantir que um dia divergissem.
 *
 * Componente não-controlado de propósito: `defaultValue` vindo de `valores`.
 * O diálogo de edição remonta os campos com `key` ao abrir, que é o padrão
 * já usado no projeto para não cair no problema de `defaultValue` que muda
 * depois do primeiro render (ver 13-roadmap-e-pendencias.md).
 */
export function PremioFields({
  valores,
  fieldErrors,
  categoriaTravada = false,
}: {
  valores: ValoresPremio;
  fieldErrors?: Record<string, string>;
  /**
   * Prêmio principal: a categoria não muda (o banco recusa). Um `<select>`
   * desabilitado não entra no FormData — por isso o valor vai num hidden.
   */
  categoriaTravada?: boolean;
}) {
  const err = (campo: string) => fieldErrors?.[campo];

  return (
    <>
      <Campo label="A quem se destina" error={err("categoria")}>
        {categoriaTravada ? (
          <input type="hidden" name="categoria" value={valores.categoria} />
        ) : null}
        <select
          name={categoriaTravada ? undefined : "categoria"}
          defaultValue={valores.categoria}
          disabled={categoriaTravada}
          required
          className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-[15px] font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:h-10 sm:text-sm"
        >
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CATEGORIA[c]}
              {DESCRICAO_CATEGORIA[c] ? ` — ${DESCRICAO_CATEGORIA[c]}` : ""}
            </option>
          ))}
        </select>
        {categoriaTravada ? (
          <p className="text-[11.5px] text-muted-foreground">
            Este é o prêmio principal: ele é sempre de cartela sorteada. Para
            mudar a categoria, promova outro prêmio a principal na tela Sorteios.
          </p>
        ) : null}
      </Campo>

      <Campo label="O prêmio" error={err("titulo")}>
        <Input
          name="titulo"
          defaultValue={valores.titulo}
          placeholder="Ex.: Uma moto 0km · R$ 2.000 em dinheiro"
          maxLength={120}
          required
        />
      </Campo>

      <div className="grid grid-cols-2 gap-3.5">
        <Campo label="Quantidade" error={err("quantidade")}>
          <Input
            name="quantidade"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            defaultValue={valores.quantidade}
            required
          />
        </Campo>
        <Campo label="Valor unitário (R$)" error={err("valor")}>
          <Input
            name="valor"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={0}
            defaultValue={valores.valor}
            placeholder="opcional"
          />
        </Campo>
      </div>

      <p className="-mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
        Dois prêmios iguais são <strong>uma linha com quantidade 2</strong>, não
        duas linhas. O valor é opcional: deixe em branco quando a paróquia não
        quiser publicar quanto o prêmio vale.
      </p>

      <Campo label="Detalhe (opcional)" error={err("descricao")}>
        <Input
          name="descricao"
          defaultValue={valores.descricao}
          placeholder="Ex.: Entregue na missa de encerramento."
          maxLength={400}
        />
      </Campo>

      <label className="flex items-start gap-2.5 rounded-lg bg-secondary px-3.5 py-3">
        <input
          type="checkbox"
          name="exibir_publico"
          defaultChecked={valores.exibir_publico}
          className="mt-0.5 size-4 accent-[var(--brand-cereja)]"
        />
        <span className="text-[13px] leading-snug">
          <strong className="font-bold">Mostrar no site público</strong>
          <span className="mt-0.5 block text-muted-foreground">
            Desmarque para cadastrar a premiação antes do anúncio oficial.
          </span>
        </span>
      </label>
    </>
  );
}

function Campo({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-[11.5px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs font-semibold text-bad">{error}</p> : null}
    </div>
  );
}
