-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v12-cartelas-bingo.sql (aplicada em produção em 25/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 12: geração de cartelas de bingo.
--
-- ESCOPO DESTA MIGRATION
--   Só o que a GERAÇÃO e a IMPRESSÃO precisam:
--     · `sorteios.modalidade` — 'rifa' (todos os existentes) ou 'bingo'
--     · `cartelas` — o conteúdo de cada cartela física
--     · `fn_verificar_cartela` — o que a rota /verificar do carimbo consulta
--
--   O sorteio ao vivo (rodadas, dezenas sorteadas, validação de cartelas,
--   painel de proximidade) NÃO entra aqui: é a próxima frente, e criar as
--   tabelas antes da tela que as usa só geraria estrutura parada.
--   Desenho completo em 14 (Iniciativa B) e 15.
--
-- ⚠️ ADITIVA POR CONSTRUÇÃO
--   Nenhuma tabela existente muda de significado. Sorteios já cadastrados
--   nascem com modalidade = 'rifa' e não enxergam diferença em tela alguma.
--
-- Pré-requisitos: schema-v1 a schema-v11 aplicados.
-- Idempotente: rodar de novo não duplica nada.
-- ============================================================================


-- ============================================================================
-- 1. MODALIDADE DO SORTEIO
--    Default 'rifa' é o que mantém a migration aditiva: todo sorteio que já
--    existe continua sendo exatamente o que era.
-- ============================================================================

alter table sorteios add column if not exists modalidade text not null default 'rifa';

do $blk$ begin
  alter table sorteios add constraint sorteios_modalidade_check
    check (modalidade in ('rifa', 'bingo'));
exception when duplicate_object then null; end $blk$;

comment on column sorteios.modalidade is
  'rifa = cartela e um numero unico (comportamento original). bingo = cartela com 24 dezenas.';


-- ============================================================================
-- 2. GERADOR DO CÓDIGO DE VERIFICAÇÃO (o carimbo impresso)
--    Oito caracteres — mesma ideia de fn_gerar_codigo_vinculo (schema-v3),
--    com dois a mais porque este código é público: ele vai impresso e é
--    consultável por qualquer pessoa em /verificar.
-- ============================================================================

create or replace function fn_gerar_codigo_cartela()
returns text language sql as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
$$;


-- ============================================================================
-- 3. TABELA cartelas
--
-- `numero` é o MESMO número já usado por lotes_cartelas/baixas_cartelas —
-- é o que liga a cartela de bingo a toda a máquina de venda que já existe
-- (reserva, baixa, comprador, apuração). Não é chave primária pelo mesmo
-- motivo de sempre: é dado de negócio, pode repetir entre sorteios.
--
-- `numeros` guarda as 24 dezenas na ordem fixa das colunas B-I-N-G-O
-- (5 + 5 + 4 + 5 + 5). A posição no array JÁ define a posição na grade —
-- por isso não existe coluna de layout. A casa central não entra no array:
-- ela é a marca do sistema impressa, nunca uma dezena a ser sorteada.
--
-- `quadros` (1 a 4): quantas vezes a mesma numeração é impressa na folha.
-- Cada quadro concorre a um prêmio diferente do mesmo evento.
-- ============================================================================

create table if not exists cartelas (
  id                  uuid primary key default gen_random_uuid(),
  sorteio_id          uuid not null references sorteios(id) on delete cascade,
  numero              int not null,
  numeros             int[] not null check (cardinality(numeros) = 24),
  quadros             int not null default 1 check (quadros between 1 and 4),
  codigo_verificacao  text not null unique default fn_gerar_codigo_cartela(),
  gerada_por          uuid references auth.users(id),
  gerada_em           timestamptz not null default now(),
  unique (sorteio_id, numero)
);

comment on table  cartelas is
  'Conteudo de cada cartela fisica de bingo. Uma linha por numero da faixa do sorteio.';
comment on column cartelas.numeros is
  '24 dezenas na ordem das colunas B-I-N-G-O (5+5+4+5+5). A posicao no array define a posicao na grade.';
comment on column cartelas.codigo_verificacao is
  'Codigo do carimbo impresso. Publico por natureza: e consultado em /verificar.';

-- `on delete cascade` no sorteio: apagar um sorteio de teste não pode
-- deixar centenas de cartelas órfãs. Diferente de `pix_chaves`, onde o
-- vínculo é set null — aqui a cartela não existe sem o sorteio.

create index if not exists idx_cartelas_sorteio on cartelas (sorteio_id);

-- GIN sobre o array: é o índice que o sorteio ao vivo vai usar para
-- "quais cartelas contêm esta dezena". Criado agora porque custa nada com
-- a tabela vazia e evita um ALTER caro depois de 1.500 linhas.
create index if not exists idx_cartelas_numeros on cartelas using gin (numeros);


-- ============================================================================
-- 4. RLS
--    Admin gerencia. `anon` NÃO lê a tabela: deixar qualquer um listar o
--    conteúdo de todas as cartelas permitiria escolher "a que está mais
--    perto de ganhar" antes de comprar. A consulta pública é pontual, por
--    código, através da função da seção 5.
-- ============================================================================

alter table cartelas enable row level security;

drop policy if exists "admin gerencia cartelas" on cartelas;
create policy "admin gerencia cartelas" on cartelas
  for all to authenticated
  using (is_admin())
  with check (is_admin());


-- ============================================================================
-- 5. VERIFICAÇÃO PÚBLICA DA CARTELA (o "/verificar" do carimbo)
--
-- `security definer` para conseguir ler a tabela apesar da RLS acima, e
-- devolvendo SÓ o que o papel já mostra a quem tem a cartela na mão.
-- Quem não souber o código não descobre nada: sem correspondência, a
-- função não devolve linha nenhuma. Não existe caminho para listar
-- cartelas — mesma disciplina de fn_confirmar_acesso_diretoria.
-- ============================================================================

create or replace function fn_verificar_cartela(p_codigo text)
returns table (
  numero        int,
  quadros       int,
  numeros       int[],
  gerada_em     timestamptz,
  sorteio_nome  text,
  sorteio_data  date
)
language sql stable security definer set search_path = public as $$
  select c.numero, c.quadros, c.numeros, c.gerada_em, s.nome, s.data_sorteio
  from cartelas c
  join sorteios s on s.id = c.sorteio_id
  where upper(trim(p_codigo)) = c.codigo_verificacao;
$$;

grant execute on function fn_verificar_cartela(text) to anon, authenticated;

-- `fn_gerar_codigo_cartela` não precisa ser chamável de fora: ela só existe
-- como default da coluna. O grant padrão do Supabase abriria para anon —
-- ver o achado 3 da inspeção (13-roadmap-e-pendencias.md).
revoke execute on function fn_gerar_codigo_cartela() from anon, authenticated;


-- ============================================================================
-- 6. VERIFICAÇÃO
-- ============================================================================

select * from (
  select 1 as ord, 'CT-01' as codigo, 'Tabela cartelas existe' as item,
         case when to_regclass('public.cartelas') is not null then 'OK' else 'FALHA' end as status
  union all
  select 2, 'CT-02', 'Coluna sorteios.modalidade com default rifa',
         coalesce((select case when column_default like '%rifa%' then 'OK' else 'FALHA' end
                     from information_schema.columns
                    where table_schema = 'public' and table_name = 'sorteios'
                      and column_name = 'modalidade'), 'FALHA (coluna ausente)')
  union all
  select 3, 'CT-03', 'Todos os sorteios existentes continuam rifa',
         case when (select count(*) from sorteios where modalidade <> 'rifa') = 0
              then 'OK' else 'ATENCAO: algum sorteio ja esta como bingo' end
  union all
  select 4, 'CT-04', 'Check de 24 dezenas por cartela',
         case when exists (select 1 from pg_constraint
                            where conrelid = 'public.cartelas'::regclass
                              and pg_get_constraintdef(oid) like '%cardinality%24%')
              then 'OK' else 'FALHA' end
  union all
  select 5, 'CT-05', 'Check de quadros entre 1 e 4',
         case when exists (select 1 from pg_constraint
                            where conrelid = 'public.cartelas'::regclass
                              and pg_get_constraintdef(oid) like '%quadros%')
              then 'OK' else 'FALHA' end
  union all
  select 6, 'CT-06', 'Indice GIN sobre numeros',
         case when exists (select 1 from pg_indexes
                            where schemaname = 'public' and indexname = 'idx_cartelas_numeros')
              then 'OK' else 'FALHA' end
  union all
  select 7, 'CT-07', 'RLS habilitada em cartelas',
         coalesce((select case when relrowsecurity then 'OK' else 'FALHA' end
                     from pg_class c join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = 'public' and c.relname = 'cartelas'), 'FALHA')
  union all
  select 8, 'CT-08', 'fn_verificar_cartela executavel por anon',
         case when exists (select 1 from information_schema.role_routine_grants
                            where routine_schema = 'public'
                              and routine_name = 'fn_verificar_cartela'
                              and grantee = 'anon')
              then 'OK' else 'FALHA' end
  union all
  select 9, 'CT-09', 'fn_gerar_codigo_cartela fechada para anon',
         case when not exists (select 1 from information_schema.role_routine_grants
                                where routine_schema = 'public'
                                  and routine_name = 'fn_gerar_codigo_cartela'
                                  and grantee in ('anon', 'authenticated'))
              then 'OK' else 'FALHA (revoke nao aplicou)' end
) v order by ord;
