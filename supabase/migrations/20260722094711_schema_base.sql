-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v1.sql (aplicada em produção em 22/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Rascunho de schema para aprovação. NÃO é uma migration definitiva do
-- projeto: depois de aprovado, este conteúdo vira migrations reais dentro
-- de app/supabase/migrations/.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist; -- exclusion constraints com uuid + int4range

-- ----------------------------------------------------------------------------
-- SORTEIOS — permite múltiplos sorteios em acompanhamento simultâneo
-- ----------------------------------------------------------------------------
create table sorteios (
  id             uuid primary key default gen_random_uuid(),
  nome           text not null,
  descricao      text,
  preco_cartela  numeric(10,2) not null,
  cartela_min    int not null,
  cartela_max    int not null check (cartela_max > cartela_min),
  status         text not null default 'planejado'
                 check (status in ('planejado','em_andamento','encerrado')),
  data_sorteio   date,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- VENDEDORES
-- ----------------------------------------------------------------------------
create table vendedores (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  telefone   text not null unique,
  ativo      boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- LOTES_CARTELAS — a reserva: intervalo (bloco ou avulsa) entregue ao
-- vendedor para vender. Lançado assim que ele sai com as cartelas, antes de
-- qualquer confirmação de venda.
-- ----------------------------------------------------------------------------
create table lotes_cartelas (
  id              uuid primary key default gen_random_uuid(),
  sorteio_id      uuid not null references sorteios(id),
  vendedor_id     uuid not null references vendedores(id),
  numero_inicial  int not null,
  numero_final    int not null check (numero_final >= numero_inicial),
  quantidade      int generated always as (numero_final - numero_inicial + 1) stored,
  tipo            text not null check (tipo in ('bloco','avulsa')),
  status          text not null default 'ativo'
                  check (status in ('ativo','cancelado')),
  origem          text not null default 'sistema'
                  check (origem in ('sistema','planilha')),
  observacao      text,
  registrado_por  uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

-- nenhum número pode ser reservado para dois vendedores no mesmo sorteio
alter table lotes_cartelas
  add constraint lotes_sem_sobreposicao
  exclude using gist (
    sorteio_id with =,
    int4range(numero_inicial, numero_final, '[]') with &&
  )
  where (status <> 'cancelado');

create index idx_lotes_sorteio_vendedor on lotes_cartelas (sorteio_id, vendedor_id);

-- ----------------------------------------------------------------------------
-- BAIXAS_CARTELAS — a confirmação: o que o vendedor efetivamente prestou
-- contas (canhoto + dinheiro e/ou confirmação dos números). Sempre um
-- subintervalo de um lote — pode ser o lote inteiro ou uma cartela isolada.
-- ----------------------------------------------------------------------------
create table baixas_cartelas (
  id                 uuid primary key default gen_random_uuid(),
  lote_id            uuid not null references lotes_cartelas(id),
  numero_inicial     int not null,
  numero_final       int not null check (numero_final >= numero_inicial),
  quantidade         int generated always as (numero_final - numero_inicial + 1) stored,
  forma_confirmacao  text not null default 'dinheiro'
                     check (forma_confirmacao in ('dinheiro','confirmacao_vendedor','ambos')),
  observacao         text,
  registrado_por     uuid references auth.users(id),
  created_at         timestamptz not null default now()
);

-- a mesma cartela não pode ser baixada duas vezes dentro do mesmo lote
alter table baixas_cartelas
  add constraint baixas_sem_sobreposicao
  exclude using gist (
    lote_id with =,
    int4range(numero_inicial, numero_final, '[]') with &&
  );

create index idx_baixas_lote on baixas_cartelas (lote_id);

-- a baixa não pode extrapolar o intervalo reservado para o vendedor
create or replace function fn_valida_baixa_dentro_do_lote()
returns trigger language plpgsql as $$
declare
  v_lote lotes_cartelas%rowtype;
begin
  select * into v_lote from lotes_cartelas where id = new.lote_id;
  if v_lote.id is null then
    raise exception 'Lote % não encontrado', new.lote_id;
  end if;
  if new.numero_inicial < v_lote.numero_inicial or new.numero_final > v_lote.numero_final then
    raise exception 'Baixa fora do intervalo reservado (lote %-%)', v_lote.numero_inicial, v_lote.numero_final;
  end if;
  return new;
end;
$$;

create trigger trg_valida_baixa
  before insert or update on baixas_cartelas
  for each row execute function fn_valida_baixa_dentro_do_lote();

-- ----------------------------------------------------------------------------
-- RESULTADOS_SORTEIO — apuração
-- ----------------------------------------------------------------------------
create table resultados_sorteio (
  id                  uuid primary key default gen_random_uuid(),
  sorteio_id          uuid not null unique references sorteios(id),
  numero_sorteado     int not null,
  vendedor_id         uuid references vendedores(id),
  cartela_confirmada  boolean not null default false,
  maior_vendedor_id   uuid references vendedores(id),
  sorteado_em         timestamptz not null default now(),
  registrado_por      uuid references auth.users(id)
);

-- ----------------------------------------------------------------------------
-- LOG_IMPORTACAO — rastreia lotes/baixas que vieram da planilha de contingência
-- ----------------------------------------------------------------------------
create table log_importacao (
  id              uuid primary key default gen_random_uuid(),
  lote_id         uuid references lotes_cartelas(id),
  baixa_id        uuid references baixas_cartelas(id),
  arquivo_origem  text not null,
  importado_por   uuid references auth.users(id),
  importado_em    timestamptz not null default now(),
  check (lote_id is not null or baixa_id is not null)
);

-- ============================================================================
-- VIEWS — KPIs
-- ============================================================================

create or replace view vw_ranking_vendedores as
with reservas as (
  select sorteio_id, vendedor_id, sum(quantidade) as total_reservado
  from lotes_cartelas
  where status = 'ativo'
  group by sorteio_id, vendedor_id
),
vendas as (
  select l.sorteio_id, l.vendedor_id, sum(b.quantidade) as total_vendido, max(b.created_at) as ultima_baixa
  from baixas_cartelas b
  join lotes_cartelas l on l.id = b.lote_id
  group by l.sorteio_id, l.vendedor_id
)
select
  r.sorteio_id,
  v.id as vendedor_id,
  v.nome,
  v.telefone,
  coalesce(ve.total_vendido, 0) as total_vendido,
  r.total_reservado,
  ve.ultima_baixa,
  rank() over (
    partition by r.sorteio_id
    order by coalesce(ve.total_vendido, 0) desc
  ) as posicao
from reservas r
join vendedores v on v.id = r.vendedor_id
left join vendas ve on ve.sorteio_id = r.sorteio_id and ve.vendedor_id = r.vendedor_id;

create or replace view vw_resumo_sorteio as
select
  s.id as sorteio_id,
  s.nome,
  s.status,
  (s.cartela_max - s.cartela_min + 1) as total_cartelas_disponiveis,
  coalesce((select sum(l.quantidade) from lotes_cartelas l where l.sorteio_id = s.id and l.status = 'ativo'), 0) as total_reservadas,
  coalesce((select sum(b.quantidade) from baixas_cartelas b join lotes_cartelas l on l.id = b.lote_id where l.sorteio_id = s.id), 0) as total_vendidas,
  coalesce((select sum(b.quantidade) from baixas_cartelas b join lotes_cartelas l on l.id = b.lote_id where l.sorteio_id = s.id), 0) * s.preco_cartela as arrecadacao_confirmada
from sorteios s;

-- ============================================================================
-- FUNÇÕES — apuração do sorteio
-- ============================================================================

create or replace function fn_localizar_vendedor_por_cartela(
  p_sorteio_id uuid,
  p_numero int
) returns table (vendedor_id uuid, nome text, telefone text, confirmada boolean)
language sql stable as $$
  select v.id, v.nome, v.telefone, true as confirmada
  from baixas_cartelas b
  join lotes_cartelas l on l.id = b.lote_id
  join vendedores v on v.id = l.vendedor_id
  where l.sorteio_id = p_sorteio_id
    and p_numero between b.numero_inicial and b.numero_final

  union all

  select v.id, v.nome, v.telefone, false as confirmada
  from lotes_cartelas l
  join vendedores v on v.id = l.vendedor_id
  where l.sorteio_id = p_sorteio_id
    and l.status = 'ativo'
    and p_numero between l.numero_inicial and l.numero_final
    and not exists (
      select 1 from baixas_cartelas b2
      where b2.lote_id = l.id and p_numero between b2.numero_inicial and b2.numero_final
    )
  limit 1;
$$;

create or replace function fn_registrar_resultado_sorteio(
  p_sorteio_id uuid,
  p_numero_sorteado int
) returns uuid
language plpgsql as $$
declare
  v_vendedor_id uuid;
  v_confirmada boolean;
  v_maior_id uuid;
  v_resultado_id uuid;
begin
  select vendedor_id, confirmada into v_vendedor_id, v_confirmada
  from fn_localizar_vendedor_por_cartela(p_sorteio_id, p_numero_sorteado);

  select vendedor_id into v_maior_id
  from vw_ranking_vendedores
  where sorteio_id = p_sorteio_id and posicao = 1;

  insert into resultados_sorteio (sorteio_id, numero_sorteado, vendedor_id, cartela_confirmada, maior_vendedor_id, sorteado_em)
  values (p_sorteio_id, p_numero_sorteado, v_vendedor_id, coalesce(v_confirmada, false), v_maior_id, now())
  returning id into v_resultado_id;

  update sorteios set status = 'encerrado' where id = p_sorteio_id;
  return v_resultado_id;
end;
$$;

-- ============================================================================
-- RLS — esboço (refinar quando a tabela de perfis/admin existir)
-- ============================================================================

alter table sorteios enable row level security;
alter table vendedores enable row level security;
alter table lotes_cartelas enable row level security;
alter table baixas_cartelas enable row level security;
alter table resultados_sorteio enable row level security;

-- leitura pública apenas das views (não das tabelas base) via funções
-- security definer ou por serem expostas no schema public com grant select
-- restrito ao role anon; detalhar junto da tabela `perfis` na fase 0.
