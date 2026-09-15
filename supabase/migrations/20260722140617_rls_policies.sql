-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v2-rls-policies.sql (aplicada em produção em 22/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 2: perfis de admin, políticas de RLS e grants públicos.
--
-- Pré-requisito: schema-v1.sql já aplicado (tabelas, views e funções).
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- Não pode ser aplicado automaticamente por mim: preciso de credenciais de
-- banco (service_role ou senha do Postgres) que não estão disponíveis aqui.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PERFIS — quem, além de estar autenticado, é administrador do painel.
-- Um usuário é criado no Supabase Auth (dashboard > Authentication > Users)
-- e depois precisa de uma linha aqui para poder gravar dados.
-- ----------------------------------------------------------------------------
create table if not exists perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "usuario le o proprio perfil"
  on perfis for select
  to authenticated
  using (id = auth.uid());

-- Função auxiliar usada por todas as políticas abaixo.
create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Depois de rodar esta migration, cadastre você mesmo como admin:
--
--   insert into perfis (id, nome)
--   values ('<uuid do usuário em Authentication > Users>', 'Rodrigo Dionizio');
--
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- RLS nas tabelas base — só admin autenticado lê/escreve; anon fica de fora
-- (o placar público só enxerga as views, mais abaixo).
-- ----------------------------------------------------------------------------
alter table sorteios            enable row level security;
alter table vendedores          enable row level security;
alter table lotes_cartelas      enable row level security;
alter table baixas_cartelas     enable row level security;
alter table resultados_sorteio  enable row level security;
alter table log_importacao      enable row level security;

create policy "admin acessa sorteios"           on sorteios           for all to authenticated using (is_admin()) with check (is_admin());
-- sorteios não tem dado sensível (nome, faixa, preço, data, status) — liberado
-- para o placar público conseguir achar sozinho o sorteio em_andamento.
create policy "publico le sorteios" on sorteios for select to anon using (true);
create policy "admin acessa vendedores"         on vendedores         for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin acessa lotes_cartelas"     on lotes_cartelas     for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin acessa baixas_cartelas"    on baixas_cartelas    for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin acessa resultados_sorteio" on resultados_sorteio for all to authenticated using (is_admin()) with check (is_admin());
create policy "admin acessa log_importacao"     on log_importacao     for all to authenticated using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- Placar público — leitura liberada só nas duas views, nunca nas tabelas.
-- Views no Postgres executam com os privilégios de quem as criou, então
-- funcionam mesmo com RLS bloqueando as tabelas base para o anon key.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on vw_ranking_vendedores to anon, authenticated;
grant select on vw_resumo_sorteio     to anon, authenticated;
grant select on sorteios              to anon; -- só para achar o sorteio em_andamento no placar

-- ----------------------------------------------------------------------------
-- Funções de apuração — só o painel admin (autenticado) pode chamar.
-- ----------------------------------------------------------------------------
grant execute on function fn_localizar_vendedor_por_cartela(uuid, int) to authenticated;
grant execute on function fn_registrar_resultado_sorteio(uuid, int)    to authenticated;
