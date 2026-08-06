"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findLoteSobreposto } from "@/lib/overlap";
import type { ReservaRow, BaixaRow, ValidationReport } from "./types";

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value).trim();
}

function cellInt(value: ExcelJS.CellValue): number {
  const text = cellText(value);
  const n = Number(text);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export async function validarPlanilha(
  aba: "reservas" | "baixas",
  formData: FormData,
): Promise<ValidationReport> {
  const file = formData.get("arquivo") as File | null;
  if (!file || file.size === 0) {
    return {
      aba,
      arquivo: "",
      reservas: [],
      baixas: [],
      erro: "Selecione um arquivo .xlsx para importar.",
    };
  }

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return {
      aba,
      arquivo: file.name,
      reservas: [],
      baixas: [],
      erro: "Não foi possível ler o arquivo. Confira se é um .xlsx válido.",
    };
  }

  const sheetName = aba === "reservas" ? "Reservas" : "Baixas";
  const sheet =
    workbook.getWorksheet(sheetName) ?? workbook.worksheets[aba === "reservas" ? 1 : 2];

  if (!sheet) {
    return {
      aba,
      arquivo: file.name,
      reservas: [],
      baixas: [],
      erro: `Aba "${sheetName}" não encontrada na planilha.`,
    };
  }

  const supabase = await createClient();
  const { data: sorteios } = await supabase.from("sorteios").select("id, nome");
  const { data: vendedores } = await supabase.from("vendedores").select("id, nome");

  const findSorteio = (nome: string) =>
    sorteios?.find((s) => s.nome.trim().toLowerCase() === nome.trim().toLowerCase());
  const findVendedor = (nome: string) =>
    vendedores?.find((v) => v.nome.trim().toLowerCase() === nome.trim().toLowerCase());

  const reservas: ReservaRow[] = [];
  const baixas: BaixaRow[] = [];

  const dataRows: ExcelJS.Row[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return; // header
    dataRows.push(row);
  });

  if (aba === "reservas") {
    for (const row of dataRows) {
      const linha = row.number;
      const sorteioNome = cellText(row.getCell(1).value);
      const vendedorNome = cellText(row.getCell(2).value);
      const numeroInicial = cellInt(row.getCell(4).value);
      const numeroFinal = cellInt(row.getCell(5).value);
      const tipo = cellText(row.getCell(6).value).toLowerCase() as "bloco" | "avulsa";

      if (!sorteioNome && !vendedorNome) continue; // blank trailing row

      const base = {
        linha,
        vendedor_nome: vendedorNome,
        numero_inicial: numeroInicial,
        numero_final: numeroFinal,
        tipo: (tipo === "avulsa" ? "avulsa" : "bloco") as "bloco" | "avulsa",
      };

      const sorteio = findSorteio(sorteioNome);
      if (!sorteio) {
        reservas.push({ ...base, status: "erro", erro: `Sorteio "${sorteioNome}" não encontrado.` });
        continue;
      }
      const vendedor = findVendedor(vendedorNome);
      if (!vendedor) {
        reservas.push({ ...base, sorteio_id: sorteio.id, status: "erro", erro: `Vendedor "${vendedorNome}" não cadastrado.` });
        continue;
      }
      if (!Number.isFinite(numeroInicial) || !Number.isFinite(numeroFinal) || numeroFinal < numeroInicial) {
        reservas.push({ ...base, sorteio_id: sorteio.id, vendedor_id: vendedor.id, status: "erro", erro: "Intervalo de cartelas inválido." });
        continue;
      }

      const conflito = await findLoteSobreposto(supabase, sorteio.id, numeroInicial, numeroFinal);
      if (conflito) {
        reservas.push({
          ...base,
          sorteio_id: sorteio.id,
          vendedor_id: vendedor.id,
          status: "erro",
          erro: `Cartelas ${conflito.numero_inicial}–${conflito.numero_final} já pertencem a ${conflito.vendedores?.nome ?? "outro vendedor"}.`,
        });
        continue;
      }

      reservas.push({ ...base, sorteio_id: sorteio.id, vendedor_id: vendedor.id, status: "ok" });
    }
  } else {
    for (const row of dataRows) {
      const linha = row.number;
      const sorteioNome = cellText(row.getCell(1).value);
      const vendedorNome = cellText(row.getCell(2).value);
      const numeroInicial = cellInt(row.getCell(3).value);
      const numeroFinal = cellInt(row.getCell(4).value);
      const formaRaw = cellText(row.getCell(5).value).toLowerCase();
      const forma = (["dinheiro", "confirmacao_vendedor", "ambos"].includes(formaRaw)
        ? formaRaw
        : "dinheiro") as BaixaRow["forma_confirmacao"];

      if (!sorteioNome && !vendedorNome) continue;

      const base = {
        linha,
        vendedor_nome: vendedorNome,
        numero_inicial: numeroInicial,
        numero_final: numeroFinal,
        forma_confirmacao: forma,
      };

      const sorteio = findSorteio(sorteioNome);
      if (!sorteio) {
        baixas.push({ ...base, status: "erro", erro: `Sorteio "${sorteioNome}" não encontrado.` });
        continue;
      }
      const vendedor = findVendedor(vendedorNome);
      if (!vendedor) {
        baixas.push({ ...base, status: "erro", erro: `Vendedor "${vendedorNome}" não cadastrado.` });
        continue;
      }
      if (!Number.isFinite(numeroInicial) || !Number.isFinite(numeroFinal) || numeroFinal < numeroInicial) {
        baixas.push({ ...base, status: "erro", erro: "Intervalo de cartelas inválido." });
        continue;
      }

      const { data: lote } = await supabase
        .from("lotes_cartelas")
        .select("id, numero_inicial, numero_final")
        .eq("sorteio_id", sorteio.id)
        .eq("vendedor_id", vendedor.id)
        .eq("status", "ativo")
        .lte("numero_inicial", numeroInicial)
        .gte("numero_final", numeroFinal)
        .maybeSingle();

      if (!lote) {
        baixas.push({ ...base, status: "erro", erro: `Nenhum lote reservado de ${vendedorNome} cobre ${numeroInicial}–${numeroFinal}.` });
        continue;
      }

      const { data: sobreposta } = await supabase
        .from("baixas_cartelas")
        .select("numero_inicial, numero_final")
        .eq("lote_id", lote.id)
        .lte("numero_inicial", numeroFinal)
        .gte("numero_final", numeroInicial)
        .maybeSingle();

      if (sobreposta) {
        baixas.push({ ...base, status: "erro", erro: `Cartelas ${sobreposta.numero_inicial}–${sobreposta.numero_final} já confirmadas.` });
        continue;
      }

      baixas.push({ ...base, lote_id: lote.id, status: "ok" });
    }
  }

  return { aba, arquivo: file.name, reservas, baixas };
}

export async function importarLinhas(
  aba: "reservas" | "baixas",
  reservas: ReservaRow[],
  baixas: BaixaRow[],
  arquivoOrigem: string,
): Promise<{ importadas: number; erro?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (aba === "reservas") {
    const validas = reservas.filter((r) => r.status === "ok");
    if (validas.length === 0) return { importadas: 0 };

    const { data: lotesInseridos, error } = await supabase
      .from("lotes_cartelas")
      .insert(
        validas.map((r) => ({
          sorteio_id: r.sorteio_id!,
          vendedor_id: r.vendedor_id!,
          numero_inicial: r.numero_inicial,
          numero_final: r.numero_final,
          tipo: r.tipo,
          origem: "planilha" as const,
        })),
      )
      .select("id");
    if (error) return { importadas: 0, erro: error.message };

    if (lotesInseridos && lotesInseridos.length > 0) {
      await supabase.from("log_importacao").insert(
        lotesInseridos.map((l) => ({
          lote_id: l.id,
          arquivo_origem: arquivoOrigem,
          importado_por: user?.id ?? null,
        })),
      );
    }

    revalidatePath("/admin/reservar");
    revalidatePath("/admin");
    return { importadas: validas.length };
  }

  const validas = baixas.filter((b) => b.status === "ok");
  if (validas.length === 0) return { importadas: 0 };

  const { data: baixasInseridas, error } = await supabase
    .from("baixas_cartelas")
    .insert(
      validas.map((b) => ({
        lote_id: b.lote_id!,
        numero_inicial: b.numero_inicial,
        numero_final: b.numero_final,
        forma_confirmacao: b.forma_confirmacao,
      })),
    )
    .select("id");
  if (error) return { importadas: 0, erro: error.message };

  if (baixasInseridas && baixasInseridas.length > 0) {
    await supabase.from("log_importacao").insert(
      baixasInseridas.map((b) => ({
        baixa_id: b.id,
        arquivo_origem: arquivoOrigem,
        importado_por: user?.id ?? null,
      })),
    );
  }

  revalidatePath("/admin/baixa");
  revalidatePath("/admin");
  return { importadas: validas.length };
}
