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
          // schema-v11 / schema-v12 / schema-v13
          pix_chave_id: string | null;
          modalidade: "rifa" | "bingo";
          premios_previstos: number;
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
          pix_chave_id?: string | null;
          modalidade?: "rifa" | "bingo";
          premios_previstos?: number;
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
          // schema-v13: qual prêmio do sorteio este resultado representa.
          // A única passou de (sorteio_id) para (sorteio_id, ordem).
          ordem: number;
          numero_sorteado: number;
          vendedor_id: string | null;
          cartela_confirmada: boolean;
          // Só preenchido no prêmio 1: o maior vendedor é do sorteio,
          // não da sequência de prêmios.
          maior_vendedor_id: string | null;
          sorteado_em: string;
          registrado_por: string | null;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          ordem?: number;
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
      acessos_diretoria: {
        Row: {
          id: string;
          sorteio_id: string;
          codigo: string;
          criado_em: string;
          atualizado_por: string | null;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          codigo: string;
          criado_em?: string;
          atualizado_por?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["acessos_diretoria"]["Insert"]
        >;
        Relationships: [];
      };
      compradores_cartela: {
        Row: {
          id: string;
          sorteio_id: string;
          numero_cartela: number;
          nome_comprador: string;
          contato_comprador: string | null;
          lote_id: string | null;
          registrado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          numero_cartela: number;
          nome_comprador: string;
          contato_comprador?: string | null;
          lote_id?: string | null;
          registrado_por?: string | null;
          criado_em?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["compradores_cartela"]["Insert"]
        >;
        Relationships: [];
      };
      // schema-v11
      pix_chaves: {
        Row: {
          id: string;
          apelido: string;
          tipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
          chave: string;
          nome_recebedor: string;
          cidade: string;
          mensagem: string | null;
          banco: string | null;
          observacoes: string | null;
          ativa: boolean;
          padrao: boolean;
          criado_por: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          apelido: string;
          tipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria";
          chave: string;
          nome_recebedor: string;
          cidade: string;
          mensagem?: string | null;
          banco?: string | null;
          observacoes?: string | null;
          ativa?: boolean;
          padrao?: boolean;
          criado_por?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["pix_chaves"]["Insert"]>;
        Relationships: [];
      };
      // migration 14 (supabase/migrations/20260915090000_premios_sorteio.sql)
      // A DESCRIÇÃO da premiação. Não participa da apuração — quem apura é
      // `resultados_sorteio` + `sorteios.premios_previstos`.
      premios_sorteio: {
        Row: {
          id: string;
          sorteio_id: string;
          ordem: number;
          categoria:
            | "cartela_sorteada"
            | "maior_vendedor"
            | "vendedor_cartela_premiada"
            | "outro";
          titulo: string;
          descricao: string | null;
          valor: number | null;
          quantidade: number;
          exibir_publico: boolean;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          ordem: number;
          categoria:
            | "cartela_sorteada"
            | "maior_vendedor"
            | "vendedor_cartela_premiada"
            | "outro";
          titulo: string;
          descricao?: string | null;
          valor?: number | null;
          quantidade?: number;
          exibir_publico?: boolean;
          criado_por?: string | null;
          criado_em?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["premios_sorteio"]["Insert"]
        >;
        Relationships: [];
      };
      // schema-v12
      cartelas: {
        Row: {
          id: string;
          sorteio_id: string;
          numero: number;
          numeros: number[];
          quadros: number;
          codigo_verificacao: string;
          gerada_por: string | null;
          gerada_em: string;
        };
        Insert: {
          id?: string;
          sorteio_id: string;
          numero: number;
          numeros: number[];
          quadros?: number;
          codigo_verificacao?: string;
          gerada_por?: string | null;
          gerada_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cartelas"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      vw_ranking_vendedores: {
        Row: {
          sorteio_id: string;
          vendedor_id: string;
          nome: string;
          // `telefone` saiu da view em schema-v10: a view é lida por `anon`,
          // e RLS é por linha, não por coluna. Quem precisa do telefone lê
          // de `vendedores` (só admin). Ver 13-roadmap-e-pendencias.md.
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
      vw_arrecadacao_diaria: {
        Row: {
          sorteio_id: string;
          dia: string;
          cartelas_dia: number;
          valor_dia: number;
        };
        Relationships: [];
      };
      vw_resultado_publico: {
        Row: {
          sorteio_id: string;
          numero_sorteado: number;
          cartela_confirmada: boolean;
          vendedor_premiado_nome: string | null;
          nome_comprador: string | null;
          maior_vendedor_nome: string | null;
          // schema-v13: a view passou a devolver UMA LINHA POR PRÊMIO.
          // Quem consome precisa listar e ordenar — `.maybeSingle()` aqui
          // dá erro assim que o 2º prêmio é apurado.
          ordem: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      // schema-v12 — consulta pública pelo código do carimbo
      fn_verificar_cartela: {
        Args: { p_codigo: string };
        Returns: {
          numero: number;
          quadros: number;
          numeros: number[];
          gerada_em: string;
          sorteio_nome: string;
          sorteio_data: string | null;
        }[];
      };
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
        // `p_ordem` tem default 1 no banco (schema-v13)
        Args: { p_sorteio_id: string; p_numero_sorteado: number; p_ordem?: number };
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
      fn_confirmar_acesso_diretoria: {
        Args: { p_sorteio_id: string; p_codigo: string };
        Returns: boolean;
      };
      regenerar_codigo_diretoria: {
        Args: { p_sorteio_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
