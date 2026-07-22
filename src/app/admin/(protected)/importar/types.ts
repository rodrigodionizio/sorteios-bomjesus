export type ReservaRow = {
  linha: number;
  status: "ok" | "erro";
  erro?: string;
  sorteio_id?: string;
  vendedor_id?: string;
  vendedor_nome: string;
  numero_inicial: number;
  numero_final: number;
  tipo: "bloco" | "avulsa";
};

export type BaixaRow = {
  linha: number;
  status: "ok" | "erro";
  erro?: string;
  lote_id?: string;
  vendedor_nome: string;
  numero_inicial: number;
  numero_final: number;
  forma_confirmacao: "dinheiro" | "confirmacao_vendedor" | "ambos";
};

export type ValidationReport = {
  aba: "reservas" | "baixas";
  arquivo: string;
  reservas: ReservaRow[];
  baixas: BaixaRow[];
  erro?: string;
};
