-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v11-chave-pix.sql (aplicada em produção em 25/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 11: cadastro de chaves Pix de recebimento.
--
-- RESOLVE
--   "cadastrar chave pix com mensagem (opcional) para ser rastreável no
--    extrato bancário; a chave pode ser atribuída a vários sorteios mas
--    01 sorteio só pode receber 01 única chave pix".
--
-- O QUE FAZ
--   · Cria `pix_chaves` (várias chaves, no máximo uma marcada como padrão).
--   · Acrescenta `sorteios.pix_chave_id` — a FK que dá o "1 sorteio, 1
--     chave"; a mesma chave pode servir a quantos sorteios quiser.
--
-- O QUE NÃO FAZ
--   Baixa automática. O QR gerado é ESTÁTICO (BR Code do Banco Central) e,
--   no nosso caso, **sem valor** — quem paga digita o total, para conseguir
--   levar várias cartelas num pagamento só. Ninguém avisa o sistema que o
--   pagamento caiu: a confirmação continua sendo o fluxo humano de sempre
--   (/admin/baixa). Confirmação automática exigiria Pix Cobrança (QR
--   dinâmico) com API do PSP e certificado mTLS.
--
-- ⚠️ NÃO MEXE EM DADO EXISTENTE
--   Só cria estrutura. `sorteios.pix_chave_id` nasce NULL em todos os
--   sorteios já cadastrados.
--
-- Pré-requisitos: schema-v1 a schema-v10 aplicados.
-- Idempotente: rodar de novo não duplica nada.
-- ============================================================================


-- ============================================================================
-- 1. HELPER DE `atualizado_em`
--    Não existia neste banco — as tabelas anteriores só guardam `criado_em`.
--    Fica genérico porque a próxima migration (cartelas) não precisa dele,
--    mas cadastros editáveis futuros vão.
-- ============================================================================

create or replace function set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;


-- ============================================================================
-- 2. TABELA pix_chaves
--
-- Os limites de tamanho não são estéticos: vêm do padrão EMV do BR Code.
--   · nome_recebedor → campo 59, máximo 25 caracteres
--   · cidade         → campo 60, máximo 15 caracteres
--   · mensagem       → vira o txid (campo 62, subcampo 05), que aceita
--                      SOMENTE [A-Za-z0-9] e no máximo 25 caracteres
--
-- A `mensagem` é limitada a 20 para sobrar espaço: o txid impresso na
-- cartela é `mensagem || numero_da_cartela`. Hífen, espaço ou acento aqui
-- gerariam um QR que parte dos aplicativos de banco recusa — e o erro só
-- apareceria quando o comprador tentasse pagar.
-- ============================================================================

create table if not exists pix_chaves (
  id              uuid primary key default gen_random_uuid(),

  apelido         text not null check (length(trim(apelido)) > 0),
  tipo            text not null check (tipo in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')),
  chave           text not null check (length(trim(chave)) > 0),

  -- vão dentro do payload do QR e aparecem no app de quem paga
  nome_recebedor  text not null check (length(nome_recebedor) between 1 and 25),
  cidade          text not null check (length(cidade) between 1 and 15),
  mensagem        text check (mensagem ~ '^[A-Za-z0-9]{1,20}$'),

  banco           text,
  observacoes     text,

  ativa           boolean not null default true,
  padrao          boolean not null default false,

  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),

  unique (tipo, chave)
);

comment on table  pix_chaves is
  'Chaves Pix de recebimento da paroquia. Alimentam o QR estatico impresso nas cartelas.';
comment on column pix_chaves.nome_recebedor is
  'Campo 59 do BR Code. Max 25 caracteres, normalizado para ASCII maiusculo na geracao.';
comment on column pix_chaves.cidade is
  'Campo 60 do BR Code. Max 15 caracteres, normalizado para ASCII maiusculo na geracao.';
comment on column pix_chaves.mensagem is
  'Prefixo do txid (campo 62-05). Somente [A-Za-z0-9], max 20 para caber com o numero da cartela.';


-- ============================================================================
-- 3. NO MÁXIMO UMA CHAVE PADRÃO
--    Índice parcial: só indexa as linhas com padrao = true, então permite
--    N linhas false. É a garantia real, à prova de concorrência — um
--    `check` não conseguiria olhar as outras linhas.
-- ============================================================================

create unique index if not exists uq_pix_chave_padrao
  on pix_chaves ((padrao)) where padrao;

create index if not exists idx_pix_chaves_ativa on pix_chaves (ativa);

-- Conveniência: marcar uma chave como padrão desmarca a anterior, em vez de
-- estourar violação de índice na cara de quem está usando a tela.
create or replace function pix_chave_padrao_unica()
returns trigger language plpgsql as $$
begin
  if new.padrao then
    -- este update redispara o trigger com new.padrao = false, e aí o if
    -- acima é falso: não há recursão
    update pix_chaves set padrao = false
     where padrao and id is distinct from new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_pix_chave_padrao on pix_chaves;
create trigger trg_pix_chave_padrao
  before insert or update of padrao on pix_chaves
  for each row execute function pix_chave_padrao_unica();

drop trigger if exists trg_pix_chaves_updated on pix_chaves;
create trigger trg_pix_chaves_updated
  before update on pix_chaves
  for each row execute function set_atualizado_em();


-- ============================================================================
-- 4. VÍNCULO COM O SORTEIO
--
-- `on delete set null`, nunca `cascade`: apagar uma chave jamais pode levar
-- um sorteio junto — o sorteio só volta a ficar sem chave.
--
-- DECISÃO DE SEGURANÇA: a chave NÃO vira coluna de `sorteios`. Aquela
-- tabela tem `policy "publico le sorteios" ... to anon using (true)` desde
-- a migration 2, e RLS é por LINHA, não por coluna — qualquer coluna nova
-- ali seria lida por qualquer visitante com a chave anônima. É exatamente o
-- erro do achado 1 da inspeção (telefone dentro de view pública). Aqui
-- `sorteios` guarda só o uuid; o valor da chave fica em `pix_chaves`, que é
-- fechada para anon.
-- ============================================================================

alter table sorteios add column if not exists pix_chave_id uuid
  references pix_chaves(id) on delete set null;

comment on column sorteios.pix_chave_id is
  'Chave Pix usada no QR das cartelas deste sorteio. NULL = sorteio sem Pix impresso.';

create index if not exists idx_sorteios_pix_chave on sorteios (pix_chave_id);


-- ============================================================================
-- 5. RLS
--    Só admin. Chave Pix não é segredo (ela é divulgada justamente para
--    receber), mas quem cadastra e edita é a coordenação — e a tabela
--    carrega dado de conta bancária da paróquia.
-- ============================================================================

alter table pix_chaves enable row level security;

drop policy if exists "admin gerencia pix_chaves" on pix_chaves;
create policy "admin gerencia pix_chaves" on pix_chaves
  for all to authenticated
  using (is_admin())
  with check (is_admin());


-- ============================================================================
-- 6. VERIFICAÇÃO
--    Uma consulta só: o SQL Editor exibe apenas o resultado do ÚLTIMO
--    comando. Todas as linhas devem sair com status OK.
-- ============================================================================

select * from (
  select 1 as ord, 'PX-01' as codigo, 'Tabela pix_chaves existe' as item,
         case when to_regclass('public.pix_chaves') is not null then 'OK' else 'FALHA' end as status
  union all
  select 2, 'PX-02', 'Indice parcial de chave padrao',
         case when exists (select 1 from pg_indexes
                            where schemaname = 'public' and indexname = 'uq_pix_chave_padrao')
              then 'OK' else 'FALHA' end
  union all
  select 3, 'PX-03', 'Trigger de chave padrao unica',
         case when exists (select 1 from pg_trigger
                            where tgname = 'trg_pix_chave_padrao' and not tgisinternal)
              then 'OK' else 'FALHA' end
  union all
  select 4, 'PX-04', 'Trigger de atualizado_em',
         case when exists (select 1 from pg_trigger
                            where tgname = 'trg_pix_chaves_updated' and not tgisinternal)
              then 'OK' else 'FALHA' end
  union all
  select 5, 'PX-05', 'Coluna sorteios.pix_chave_id',
         case when exists (select 1 from information_schema.columns
                            where table_schema = 'public' and table_name = 'sorteios'
                              and column_name = 'pix_chave_id')
              then 'OK' else 'FALHA' end
  union all
  select 6, 'PX-06', 'FK pix_chave_id com ON DELETE SET NULL',
         coalesce((select case when confdeltype = 'n' then 'OK'
                               else 'FALHA (esperado SET NULL)' end
                     from pg_constraint
                    where conrelid = 'public.sorteios'::regclass
                      and contype = 'f'
                      and confrelid = 'public.pix_chaves'::regclass
                    limit 1), 'FALHA (FK ausente)')
  union all
  select 7, 'PX-07', 'RLS habilitada em pix_chaves',
         coalesce((select case when relrowsecurity then 'OK' else 'FALHA' end
                     from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = 'pix_chaves'), 'FALHA')
  union all
  select 8, 'PX-08', 'Nenhum sorteio existente foi alterado',
         case when (select count(*) from sorteios where pix_chave_id is not null) = 0
              then 'OK (todos com pix_chave_id NULL, como esperado)'
              else 'ATENCAO: algum sorteio ja tem chave vinculada' end
) v order by ord;
