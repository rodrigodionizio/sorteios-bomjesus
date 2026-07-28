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
          user_id: string | null;
          email: string | null;
          codigo_vinculo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          telefone: string;
          ativo?: boolean;
          user_id?: string | null;
          email?: string | null;
          codigo_vinculo?: string | null;
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
          forma_confirmacao:
            | "dinheiro"
            | "confirmacao_vendedor"
            | "ambos"
            | "transferencia"
            | "pix";
          observacao: string | null;
          registrado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lote_id: string;
          numero_inicial: number;
          numero_final: number;
          forma_confirmacao?:
            | "dinheiro"
            | "confirmacao_vendedor"
            | "ambos"
            | "transferencia"
            | "pix";
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
          email: string | null;
          display_name: string | null;
          cargo: string | null;
          role: "superadmin" | "admin" | "vendedor";
          created_at: string;
        };
        Insert: {
          id: string;
          nome?: string | null;
          email?: string | null;
          display_name?: string | null;
          cargo?: string | null;
          role?: "superadmin" | "admin" | "vendedor";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfis"]["Insert"]>;
        Relationships: [];
      };
      convites: {
        Row: {
          id: string;
          email: string;
          nome: string | null;
          role: "admin" | "superadmin";
          convidado_por: string | null;
          created_at: string;
          aceito_em: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          nome?: string | null;
          role?: "admin" | "superadmin";
          convidado_por?: string | null;
          created_at?: string;
          aceito_em?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["convites"]["Insert"]>;
        Relationships: [];
      };
      eventos_auditoria: {
        Row: {
          id: string;
          acao: string;
          entidade: string | null;
          entidade_id: string | null;
          detalhes: Json | null;
          realizado_por: string | null;
          realizado_em: string;
        };
        Insert: {
          id?: string;
          acao: string;
          entidade?: string | null;
          entidade_id?: string | null;
          detalhes?: Json | null;
          realizado_por?: string | null;
          realizado_em?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["eventos_auditoria"]["Insert"]
        >;
        Relationships: [];
      };
      solicitacoes_baixa: {
        Row: {
          id: string;
          lote_id: string;
          numero_inicial: number;
          numero_final: number;
          quantidade: number;
          forma_alegada: "dinheiro" | "transferencia" | "pix";
          observacao: string | null;
          comprovante_path: string | null;
          status: "pendente" | "aprovada" | "rejeitada";
          motivo_rejeicao: string | null;
          solicitado_por: string;
          solicitado_em: string;
          analisado_por: string | null;
          analisado_em: string | null;
        };
        Insert: {
          id?: string;
          lote_id: string;
          numero_inicial: number;
          numero_final: number;
          forma_alegada: "dinheiro" | "transferencia" | "pix";
          observacao?: string | null;
          comprovante_path?: string | null;
          status?: "pendente" | "aprovada" | "rejeitada";
          motivo_rejeicao?: string | null;
          solicitado_por: string;
          solicitado_em?: string;
          analisado_por?: string | null;
          analisado_em?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["solicitacoes_baixa"]["Insert"]
        >;
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
      vw_lote_progresso: {
        Row: {
          lote_id: string;
          sorteio_id: string;
          sorteio_nome: string;
          sorteio_status: "planejado" | "em_andamento" | "encerrado";
          vendedor_id: string;
          numero_inicial: number;
          numero_final: number;
          quantidade: number;
          tipo: "bloco" | "avulsa";
          confirmado: number;
          pendente: number;
          solicitado_pendente: number;
        };
        Relationships: [];
      };
      vw_solicitacoes_pendentes_admin: {
        Row: {
          id: string;
          lote_id: string;
          sorteio_id: string;
          vendedor_id: string;
          vendedor_nome: string;
          numero_inicial: number;
          numero_final: number;
          quantidade: number;
          forma_alegada: "dinheiro" | "transferencia" | "pix";
          observacao: string | null;
          comprovante_path: string | null;
          solicitado_em: string;
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
      fn_vincular_vendedor: {
        Args: { p_telefone: string; p_codigo: string };
        Returns: boolean;
      };
      alterar_papel: {
        Args: { p_perfil_id: string; p_novo_role: string };
        Returns: undefined;
      };
      regenerar_codigo_vinculo: {
        Args: { p_vendedor_id: string };
        Returns: string;
      };
      desvincular_vendedor: {
        Args: { p_vendedor_id: string };
        Returns: undefined;
      };
      remover_acesso: {
        Args: { p_perfil_id: string };
        Returns: undefined;
      };
      cancelar_convite: {
        Args: { p_convite_id: string };
        Returns: undefined;
      };
      aprovar_solicitacao: {
        Args: { p_solicitacao_id: string };
        Returns: string;
      };
      rejeitar_solicitacao: {
        Args: { p_solicitacao_id: string; p_motivo: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
