-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v4-pix.sql (aplicada em produção em 28/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 4: adiciona "pix" como forma de pagamento — hoje a forma mais
-- comum de confirmação de venda, e distinta de "transferência" (TED/DOC)
-- na cabeça de quem usa o sistema no dia a dia.
--
-- Pré-requisito: schema-v3-usuarios-perfis-vendedores.sql já aplicado.
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- ============================================================================

-- lançamento direto do admin em /admin/baixa
alter table baixas_cartelas drop constraint if exists baixas_cartelas_forma_confirmacao_check;
alter table baixas_cartelas add constraint baixas_cartelas_forma_confirmacao_check
  check (forma_confirmacao in ('dinheiro', 'confirmacao_vendedor', 'ambos', 'transferencia', 'pix'));

-- forma alegada pelo vendedor ao solicitar baixa
alter table solicitacoes_baixa drop constraint if exists solicitacoes_baixa_forma_alegada_check;
alter table solicitacoes_baixa add constraint solicitacoes_baixa_forma_alegada_check
  check (forma_alegada in ('dinheiro', 'transferencia', 'pix'));

-- `aprovar_solicitacao()` (schema-v3) grava `forma_confirmacao = v_sol.forma_alegada`
-- direto, sem tradução — como os dois `check` acima agora aceitam os mesmos
-- três valores mais 'pix', nenhuma outra função precisa mudar.
