export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      sorteios: {
        Row: {
          id: string;
          nome: string;
          descricao: string | null;
          preco_cartela: number;
          cartela_min: number;
          cartela_max: number;
          status: "planejado" | "em_andamento" | "encerrado";
          data_sorteio: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          descricao?: string | null;
          preco_cartela: number;
          cartela_min: number;
          cartela_max: number;
          status?: "planejado" | "em_andamento" | "encerrado";
          data_sorteio?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sorteios"]["Insert"]>;
        Relationships: [];
      };
      vendedores: {
        Row: {
          id: string;
          nome: string;
          telefone: string;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone: string;
          ativo?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["vendedores"]["Insert"]>;
        Relationships: [];
      };
      lotes_cartelas: {
        Row: {
          id: string;
          sorteio_id: string;
          vendedor_id: string;
          numero_inicial: number;
          numero_final: number;
          quantidade: number;
          tipo: "bloco" | "avulsa";
          status: "ativo" | "cancelado";
          origem: "sistema" | "planilha";
          observacao: string | null;
          registrado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          vendedor_id: string;
          numero_inicial: number;
          numero_final: number;
          tipo: "bloco" | "avulsa";
          status?: "ativo" | "cancelado";
          origem?: "sistema" | "planilha";
          observacao?: string | null;
          registrado_por?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["lotes_cartelas"]["Insert"]
        >;
        Relationships: [];
      };
      baixas_cartelas: {
        Row: {
          id: string;
          lote_id: string;
          numero_inicial: number;
          numero_final: number;
          quantidade: number;
          forma_confirmacao: "dinheiro" | "confirmacao_vendedor" | "ambos";
          observacao: string | null;
          registrado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lote_id: string;
          numero_inicial: number;
          numero_final: number;
          forma_confirmacao?: "dinheiro" | "confirmacao_vendedor" | "ambos";
          observacao?: string | null;
          registrado_por?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["baixas_cartelas"]["Insert"]
        >;
        Relationships: [];
      };
      resultados_sorteio: {
        Row: {
          id: string;
          sorteio_id: string;
          numero_sorteado: number;
          vendedor_id: string | null;
          cartela_confirmada: boolean;
          maior_vendedor_id: string | null;
          sorteado_em: string;
          registrado_por: string | null;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          numero_sorteado: number;
          vendedor_id?: string | null;
          cartela_confirmada?: boolean;
          maior_vendedor_id?: string | null;
          sorteado_em?: string;
          registrado_por?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["resultados_sorteio"]["Insert"]
        >;
        Relationships: [];
      };
      log_importacao: {
        Row: {
          id: string;
          lote_id: string | null;
          baixa_id: string | null;
          arquivo_origem: string;
          importado_por: string | null;
          importado_em: string;
        };
        Insert: {
          id?: string;
          lote_id?: string | null;
          baixa_id?: string | null;
          arquivo_origem: string;
          importado_por?: string | null;
          importado_em?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["log_importacao"]["Insert"]
        >;
        Relationships: [];
      };
      perfis: {
        Row: {
          id: string;
          nome: string | null;
          role: "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          role?: "admin";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfis"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_ranking_vendedores: {
        Row: {
          sorteio_id: string;
          vendedor_id: string;
          nome: string;
          telefone: string;
          total_vendido: number;
          total_reservado: number;
          ultima_baixa: string | null;
          posicao: number;
        };
        Relationships: [];
      };
      vw_resumo_sorteio: {
        Row: {
          sorteio_id: string;
          nome: string;
          status: "planejado" | "em_andamento" | "encerrado";
          total_cartelas_disponiveis: number;
          total_reservadas: number;
          total_vendidas: number;
          arrecadacao_confirmada: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      fn_localizar_vendedor_por_cartela: {
        Args: { p_sorteio_id: string; p_numero: number };
        Returns: {
          vendedor_id: string;
          nome: string;
          telefone: string;
          confirmada: boolean;
        }[];
      };
      fn_registrar_resultado_sorteio: {
        Args: { p_sorteio_id: string; p_numero_sorteado: number };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
