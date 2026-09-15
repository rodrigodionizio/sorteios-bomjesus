-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 14: prêmios por sorteio.
--
-- RESOLVE
--   A descrição da premiação estava ESCRITA NO CÓDIGO, em src/app/page.tsx:
--   "Prêmios para o(a) maior vendedor(a) geral e para quem vender a cartela
--   sorteada". Texto fixo, igual para todo sorteio. Os prêmios reais do
--   Sorteio Bom Jesus 2026 (dois de R$ 2.000 em dinheiro e uma moto 0km)
--   não existiam em lugar nenhum do banco, e um sorteio futuro com outra
--   premiação exibiria a descrição do de 2026 até alguém editar o .tsx e
--   fazer deploy.
--
-- POR QUE NÃO SERVIU `sorteios.premios_previstos` (migration 13)
--   Aquela coluna conta QUANTOS NÚMEROS serão sorteados — são os prêmios de
--   quem COMPROU a cartela. A moto e o dinheiro são prêmios de VENDEDOR:
--   não têm número sorteado nenhum, são decididos pelo ranking de vendas e
--   por quem vendeu a cartela premiada. São duas famílias diferentes, e
--   tentar espremer as duas num contador só foi o que manteve a premiação
--   fora do banco até aqui.
--
--   As duas continuam convivendo: `premios_previstos` segue sendo o que a
--   apuração usa (quantas vezes `fn_registrar_resultado_sorteio` pode ser
--   chamada); esta tabela é a DESCRIÇÃO da premiação, para exibição.
--   A tela avisa quando divergem — ver a seção 5.
--
-- ⚠️ ADITIVA POR CONSTRUÇÃO
--   Tabela nova. Nenhuma tabela, view ou função existente é alterada.
--   Sorteio sem prêmio cadastrado continua funcionando exatamente como hoje
--   (a interface simplesmente não mostra o bloco de premiação).
--
-- Pré-requisito: todas as migrations anteriores aplicadas.
-- ============================================================================


-- ============================================================================
-- 1. A TABELA
-- ============================================================================

create table if not exists premios_sorteio (
  id          uuid primary key default gen_random_uuid(),
  sorteio_id  uuid not null references sorteios(id) on delete cascade,

  -- Ordem de exibição, não de apuração. Para os prêmios de categoria
  -- 'cartela_sorteada' ela COINCIDE com `resultados_sorteio.ordem` — é o
  -- que liga "2º prêmio" ao número efetivamente sorteado. Para os prêmios
  -- de vendedor é só a posição na lista.
  ordem       int  not null check (ordem >= 1),

  categoria   text not null check (categoria in (
                'cartela_sorteada',           -- vai para quem comprou a cartela sorteada
                'maior_vendedor',             -- vai para quem mais vendeu
                'vendedor_cartela_premiada',  -- vai para quem vendeu a cartela sorteada
                'outro')),

  titulo      text not null check (length(trim(titulo)) > 0),
  descricao   text,

  -- Opcional de propósito: "uma moto 0km" não tem valor que a paróquia
  -- queira publicar, e "R$ 2.000" tem. Quando nulo, a interface mostra só
  -- o título.
  valor       numeric(10,2) check (valor is null or valor >= 0),

  -- Dois prêmios idênticos de R$ 2.000 são UMA linha com quantidade = 2,
  -- não duas linhas. Foi assim que a paróquia descreveu a premiação.
  quantidade  int not null default 1 check (quantidade >= 1),

  -- Permite cadastrar a premiação antes de divulgar, ou guardar um prêmio
  -- interno que não vai ao placar público.
  exibir_publico boolean not null default true,

  criado_por  uuid references auth.users(id),
  criado_em   timestamptz not null default now(),

  constraint premios_sorteio_ordem_unica unique (sorteio_id, ordem)
);

create index if not exists idx_premios_sorteio on premios_sorteio (sorteio_id, ordem);

comment on table premios_sorteio is
  'Descrição da premiação de cada sorteio. Substitui o texto fixo que estava '
  'em src/app/page.tsx. Não participa da apuração — quem apura é '
  'resultados_sorteio + sorteios.premios_previstos.';


-- ============================================================================
-- 2. RLS
--
--    Admin gerencia tudo. O público lê APENAS as linhas marcadas como
--    `exibir_publico` — e é RLS por linha, que é exatamente a granularidade
--    de que se precisa aqui (diferente do caso do telefone do vendedor na
--    inspeção de 11/08, onde o problema era por COLUNA e por isso exigiu
--    tirar a coluna da view).
--
--    Não há dado pessoal nesta tabela. O que se protege é só a divulgação
--    antecipada de uma premiação ainda não anunciada.
-- ============================================================================

alter table premios_sorteio enable row level security;

drop policy if exists "admin gerencia premios" on premios_sorteio;
create policy "admin gerencia premios" on premios_sorteio
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- `anon` para o placar e a landing; `authenticated` para que o vendedor
-- logado (que NÃO é admin) também consiga ver a premiação na área dele.
drop policy if exists "publico le premios visiveis" on premios_sorteio;
create policy "publico le premios visiveis" on premios_sorteio
  for select to anon, authenticated
  using (exibir_publico);

grant select on premios_sorteio to anon, authenticated;
grant insert, update, delete on premios_sorteio to authenticated;

-- O Supabase concede, por DEFAULT PRIVILEGES, insert/update/delete a `anon`
-- em toda tabela nova do schema public — é o achado 5 da inspeção de
-- 11/08/2026 (13-roadmap-e-pendencias.md), ainda aberto no banco. A RLS
-- acima já barraria a escrita, mas grant amplo + uma policy futura escrita
-- sem cuidado é como o buraco vira falha. Revogado explicitamente aqui.
revoke insert, update, delete, truncate, references, trigger
  on premios_sorteio from anon;


-- ============================================================================
-- 3. VERIFICAÇÃO
--    Rode junto com a migration e confira que tudo deu OK antes de seguir.
-- ============================================================================

select * from (
  select 1 as ord, 'PR-01' as codigo, 'Tabela premios_sorteio existe' as item,
         case when to_regclass('public.premios_sorteio') is not null
              then 'OK' else 'FALHA' end as status

  union all
  select 2, 'PR-02', 'RLS ligada',
         case when exists (select 1 from pg_tables
                            where schemaname = 'public'
                              and tablename = 'premios_sorteio'
                              and rowsecurity)
              then 'OK' else 'FALHA' end

  union all
  select 3, 'PR-03', 'Policy de leitura publica existe',
         case when exists (select 1 from pg_policies
                            where schemaname = 'public'
                              and tablename = 'premios_sorteio'
                              and policyname = 'publico le premios visiveis')
              then 'OK' else 'FALHA' end

  union all
  select 4, 'PR-04', 'anon tem select',
         case when exists (select 1 from information_schema.role_table_grants
                            where table_schema = 'public'
                              and table_name = 'premios_sorteio'
                              and grantee = 'anon'
                              and privilege_type = 'SELECT')
              then 'OK' else 'FALHA' end

  union all
  select 5, 'PR-05', 'anon NAO tem insert/update/delete',
         case when not exists (select 1 from information_schema.role_table_grants
                                where table_schema = 'public'
                                  and table_name = 'premios_sorteio'
                                  and grantee = 'anon'
                                  and privilege_type in ('INSERT','UPDATE','DELETE'))
              then 'OK' else 'FALHA (grant amplo do Supabase — revogue)' end
) t order by ord;
