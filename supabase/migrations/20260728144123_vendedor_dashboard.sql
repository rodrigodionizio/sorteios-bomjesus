-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v5-vendedor-dashboard.sql (aplicada em produção em 28/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 5: ajuste para o dashboard do vendedor (/vendedor) conseguir
-- mostrar o nome do sorteio de cada lote sem precisar de acesso direto à
-- tabela `sorteios` — que hoje só é lida por admin (RLS) ou por `anon`
-- (o placar público). Um vendedor autenticado não é nem uma coisa nem
-- outra, então uma consulta direta a `sorteios` voltaria vazia para ele.
--
-- Em vez de abrir uma política de RLS nova em `sorteios` só para isso,
-- a view (que já roda com privilégios de quem a criou, bypassando RLS
-- da tabela base — mesmo padrão de vw_ranking_vendedores) passa a trazer
-- o nome/status do sorteio junto — menor superfície de mudança.
--
-- IMPORTANTE: `create or replace view` só aceita ACRESCENTAR colunas no
-- fim da lista — tentar inserir no meio (empurrando o nome/posição de
-- uma coluna já existente) dá erro 42P16 ("cannot change name of view
-- column"). Por isso `sorteio_nome`/`sorteio_status` vão no final,
-- mesmo não sendo a ordem mais "natural" de leitura.
--
-- Pré-requisito: schema-v3-usuarios-perfis-vendedores.sql já aplicado.
-- Se você já tentou rodar uma versão anterior deste arquivo e ela deu
-- erro 42P16, a view não foi alterada — pode rodar este arquivo
-- normalmente, do zero.
-- ============================================================================

create or replace view vw_lote_progresso as
select
  l.id as lote_id,
  l.sorteio_id,
  l.vendedor_id,
  l.numero_inicial,
  l.numero_final,
  l.quantidade,
  l.tipo,
  coalesce((select sum(b.quantidade) from baixas_cartelas b where b.lote_id = l.id), 0) as confirmado,
  l.quantidade - coalesce((select sum(b.quantidade) from baixas_cartelas b where b.lote_id = l.id), 0) as pendente,
  coalesce((
    select sum(sol.quantidade) from solicitacoes_baixa sol
    where sol.lote_id = l.id and sol.status = 'pendente'
  ), 0) as solicitado_pendente,
  s.nome as sorteio_nome,
  s.status as sorteio_status
from lotes_cartelas l
join sorteios s on s.id = l.sorteio_id
where l.status = 'ativo'
  and (
    is_admin()
    or l.vendedor_id in (select id from vendedores where user_id = auth.uid())
  );
