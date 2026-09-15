-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v8-comprador-cartela.sql (aplicada em produção em 05/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 8: comprador por cartela — nome e contato de quem comprou,
-- opcional, registrado pelo admin ao confirmar a baixa. Exclusivo da área
-- administrativa: em /admin/apuracao aparece nome + contato; no Painel da
-- Diretoria (/diretoria) e no placar público (/) aparece só o nome do
-- comprador da cartela premiada, nunca o contato.
--
-- DECISÃO DE MODELAGEM — por que uma tabela nova, e não uma coluna:
-- `lotes_cartelas`/`baixas_cartelas` guardam intervalos (numero_inicial–
-- numero_final), nunca uma linha por cartela individual (ver 03-modelo-de-
-- dados-der.md) — decisão deliberada para manter as tabelas pequenas.
-- Comprador é uma informação por NÚMERO, não por intervalo, então vive
-- numa tabela própria, chaveada por (sorteio_id, numero_cartela) — sem
-- mexer no formato de `lotes_cartelas`/`baixas_cartelas`. A mesma chave
-- também generaliza direto para o futuro sistema de bingo (Iniciativa B
-- do roadmap), quando cartelas passarem a ser geradas com numeração
-- própria — nenhum rework necessário aqui quando isso acontecer.
--
-- DECISÃO DE SEGURANÇA — por que o contato nunca sai da área administrativa:
-- mesma lição do schema-v7 (painel da diretoria) — RLS é por LINHA, não
-- por coluna. A tabela em si só é lida por quem é admin (nenhuma policy
-- para `anon`/`vendedor`), e a view pública abaixo simplesmente NÃO
-- seleciona a coluna `contato_comprador` — nenhum caminho público
-- consegue lê-la, mesmo por engano futuro num `select *`.
--
-- Pré-requisito: schema-v1.sql, schema-v2-rls-policies.sql e
-- schema-v3-usuarios-perfis-vendedores.sql (para `is_admin()`) já aplicados.
-- ============================================================================

create table if not exists compradores_cartela (
  id                uuid primary key default gen_random_uuid(),
  sorteio_id        uuid not null references sorteios(id),
  numero_cartela    int not null,
  nome_comprador    text not null,
  contato_comprador text,
  lote_id           uuid references lotes_cartelas(id),
  registrado_por    uuid references auth.users(id),
  criado_em         timestamptz not null default now(),
  unique (sorteio_id, numero_cartela)
);

alter table compradores_cartela enable row level security;

create policy "admin gerencia compradores_cartela" on compradores_cartela
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Sem nenhuma policy para `anon` nem para `authenticated` genérico — nome
-- e contato do comprador só existem para quem é admin. Inserido/editado
-- por escrita direta na tabela a partir das Server Actions de
-- /admin/baixa (mesmo padrão já usado em `baixas_cartelas`), não precisa
-- de função `security definer` — quem chama já é admin, checado pela
-- própria RLS acima.

-- ============================================================================
-- View pública do resultado: só existe linha depois que
-- fn_registrar_resultado_sorteio roda em /admin/apuracao. Devolve o nome
-- do vendedor premiado, o nome do maior vendedor, e o nome do comprador
-- da cartela premiada — nunca o contato. Usada por /diretoria e pelo
-- placar público (/).
-- ============================================================================

create or replace view vw_resultado_publico as
select
  r.sorteio_id,
  r.numero_sorteado,
  r.cartela_confirmada,
  vp.nome as vendedor_premiado_nome,
  cc.nome_comprador,
  vm.nome as maior_vendedor_nome
from resultados_sorteio r
left join vendedores vp on vp.id = r.vendedor_id
left join vendedores vm on vm.id = r.maior_vendedor_id
left join compradores_cartela cc
  on cc.sorteio_id = r.sorteio_id and cc.numero_cartela = r.numero_sorteado;

grant select on vw_resultado_publico to anon, authenticated;

-- ============================================================================
-- Depois de rodar esta migration:
--
-- Nada a fazer manualmente — ao contrário do schema-v7, não existe código
-- de acesso para gerar. A captura do comprador é opcional e feita direto
-- na tela de /admin/baixa a partir de agora; o card "Resultado do
-- sorteio" em /diretoria e no placar público só aparece depois da
-- próxima apuração registrada em /admin/apuracao.
-- ============================================================================
