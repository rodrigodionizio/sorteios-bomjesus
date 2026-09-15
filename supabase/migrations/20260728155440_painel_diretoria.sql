-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v7-painel-diretoria.sql (aplicada em produção em 28/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 7: painel público de acesso restrito para diretoria/tesouraria
-- (/diretoria) — link exclusivo, protegido por um código de acesso por
-- sorteio, com total arrecadado, cartelas vendidas, progresso e tendência
-- diária, atualizando sozinho (mesmo Realtime já usado no placar público).
--
-- DECISÃO DE SEGURANÇA — por que o código NÃO é uma coluna em `sorteios`:
-- `sorteios` já tem, desde schema-v2, `create policy "publico le sorteios"
-- on sorteios for select to anon using (true)`. RLS é por LINHA, não por
-- coluna — qualquer coluna nova ali seria lida por qualquer visitante via
-- `supabase.from('sorteios').select('*')`, exatamente o mesmo client já
-- usado pelo placar público. Por isso o código mora numa tabela própria,
-- sem NENHUMA política de leitura para fora do admin — a única forma de
-- "ler" o código de fora é validá-lo através de uma função que devolve só
-- verdadeiro/falso, nunca o valor em si (mesmo padrão de segurança já
-- usado em `fn_vincular_vendedor`, ver schema-v3).
--
-- Pré-requisito: schema-v1.sql e schema-v2-rls-policies.sql já aplicados.
-- ============================================================================

create table if not exists acessos_diretoria (
  id             uuid primary key default gen_random_uuid(),
  sorteio_id     uuid not null unique references sorteios(id),
  codigo         text not null,
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references auth.users(id)
);

alter table acessos_diretoria enable row level security;

create policy "admin gerencia acessos_diretoria" on acessos_diretoria
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Sem nenhuma policy para `anon` nem para `authenticated` genérico — só
-- admin lê/escreve direto na tabela. A confirmação de código (abaixo)
-- não precisa de RLS: é `security definer`, e devolve só um boolean.

create or replace function fn_confirmar_acesso_diretoria(p_sorteio_id uuid, p_codigo text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from acessos_diretoria
    where sorteio_id = p_sorteio_id and codigo = p_codigo
  );
$$;

grant execute on function fn_confirmar_acesso_diretoria(uuid, text) to anon, authenticated;

-- Gerar/regenerar o código — mesma disciplina de `regenerar_codigo_vinculo`
-- (schema-v3): só admin, sempre por função, nunca update direto na tabela
-- pelo client (evita qualquer chance de esquecer a checagem de permissão).
create or replace function regenerar_codigo_diretoria(p_sorteio_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not is_admin() then
    raise exception 'Só administradores podem gerar um código de acesso.';
  end if;

  v_codigo := fn_gerar_codigo_vinculo(); -- mesmo gerador já usado para vendedores (schema-v3)

  insert into acessos_diretoria (sorteio_id, codigo, atualizado_por)
  values (p_sorteio_id, v_codigo, auth.uid())
  on conflict (sorteio_id) do update
    set codigo = excluded.codigo, atualizado_por = excluded.atualizado_por, criado_em = now();

  return v_codigo;
end;
$$;

grant execute on function regenerar_codigo_diretoria(uuid) to authenticated;

-- ============================================================================
-- View: arrecadação por dia — o único dado que os KPIs/rankings já
-- existentes (vw_resumo_sorteio, vw_ranking_vendedores) não cobriam. Já
-- nasce liberada para `anon`, no mesmo espírito das outras duas: nenhuma
-- coluna sensível, só totais agregados por dia.
-- ============================================================================

create or replace view vw_arrecadacao_diaria as
select
  l.sorteio_id,
  (b.created_at at time zone 'America/Fortaleza')::date as dia,
  sum(b.quantidade) as cartelas_dia,
  sum(b.quantidade) * s.preco_cartela as valor_dia
from baixas_cartelas b
join lotes_cartelas l on l.id = b.lote_id
join sorteios s on s.id = l.sorteio_id
group by l.sorteio_id, (b.created_at at time zone 'America/Fortaleza')::date, s.preco_cartela
order by dia;

grant select on vw_arrecadacao_diaria to anon, authenticated;

-- ============================================================================
-- Depois de rodar esta migration:
--
-- 1. Em /admin/sorteios, gere um código de acesso para o sorteio atual
--    (botão novo, mesma lógica de "gerar novo código" já usada em
--    /admin/vendedores) — sem isso, ninguém consegue confirmar acesso
--    ao painel, porque não existe nenhuma linha em `acessos_diretoria`
--    ainda para nenhum sorteio.
-- 2. Compartilhe o link `/diretoria` + o código com quem precisa
--    acompanhar (diretoria/tesouraria) — fora isso, o link sozinho não
--    abre nada.
-- ============================================================================
