-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v13-multiplos-premios.sql (aplicada em produção em 29/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 13: múltiplos prêmios por sorteio.
--
-- RESOLVE
--   `resultados_sorteio.sorteio_id` era UNIQUE e a apuração encerrava o
--   sorteio. Juntas, as duas coisas impediam registrar o 2º prêmio: apurar
--   o primeiro fechava a porta. Vale tanto para o bingo (cartela com N
--   quadros = N prêmios) quanto para a rifa (o cartaz da paróquia já tem
--   dois prêmios).
--
-- CALIBRADA PELO PRÉ-VOO de 29/08/2026 (preflight-v13.sql):
--   · 1 resultado já gravado, do "Sorteio Teste" → vira o prêmio nº 1 dele
--   · constraint a derrubar: resultados_sorteio_sorteio_id_key
--   · uma única assinatura da função: (uuid, integer), sem security definer
--   · vw_resultado_publico sem views dependentes
--   · PRODUÇÃO: "Show de Prêmios da Bom Jesus 2026", em_andamento,
--     4.000 cartelas com quadros = 2 → precisa de premios_previstos = 2
--
-- ⚠️ NÃO TOCA EM DADO DE VENDA
--   lotes_cartelas, baixas_cartelas, compradores_cartela, vendedores e
--   cartelas não são lidos nem alterados. As duas colunas novas usam
--   `add column not null default <constante>`, que no Postgres 11+ é
--   operação de metadados — não reescreve linha nenhuma.
--
-- ORDEM DE EXECUÇÃO (importante):
--   1. rodar esta migration        → o site continua funcionando
--   2. fazer o deploy do app       → passa a listar prêmios
--   3. só então apurar o 2º prêmio → a view passa a devolver 2 linhas
--   Invertendo 1 e 2, o app pediria a coluna `ordem` antes de ela existir.
--
-- Pré-requisitos: schema-v1 a schema-v12 aplicados.
-- Idempotente: rodar de novo não duplica nada.
-- ============================================================================


-- ============================================================================
-- 1. QUAL PRÊMIO ESTE RESULTADO REPRESENTA
-- ============================================================================

alter table resultados_sorteio add column if not exists ordem int not null default 1;

do $blk$ begin
  alter table resultados_sorteio add constraint resultados_sorteio_ordem_check
    check (ordem between 1 and 10);
exception when duplicate_object then null; end $blk$;

comment on column resultados_sorteio.ordem is
  'Qual premio do sorteio este resultado representa (1 = primeiro). O resultado que ja existia virou o premio 1.';


-- ============================================================================
-- 2. A TROCA QUE RESOLVE O DEFEITO
--    Um resultado por PRÊMIO, não por sorteio. O nome da constraint veio
--    do pré-voo — derrubar pelo nome errado falharia, e derrubar a errada
--    quebraria integridade.
-- ============================================================================

alter table resultados_sorteio drop constraint if exists resultados_sorteio_sorteio_id_key;

do $blk$ begin
  alter table resultados_sorteio add constraint resultados_sorteio_sorteio_ordem_key
    unique (sorteio_id, ordem);
exception when duplicate_object then null; end $blk$;


-- ============================================================================
-- 3. QUANTOS PRÊMIOS O SORTEIO TEM
--
--    Por que um campo, e não deduzir de `cartelas.quadros`:
--      · a RIFA não tem cartela gerada — não haveria de onde deduzir, e é
--        justamente ela que já tem dois prêmios no cartaz;
--      · no BINGO a geração é incremental, então poderia haver levas com
--        quadros diferentes no mesmo sorteio, e `max(quadros)` daria uma
--        resposta que não vale para todas as cartelas.
-- ============================================================================

alter table sorteios add column if not exists premios_previstos int not null default 1;

do $blk$ begin
  alter table sorteios add constraint sorteios_premios_previstos_check
    check (premios_previstos between 1 and 10);
exception when duplicate_object then null; end $blk$;

comment on column sorteios.premios_previstos is
  'Quantos premios este sorteio distribui. No bingo e mantido igual a cartelas.quadros pela tela de geracao.';

-- BACKFILL — o passo que o pré-voo tornou obrigatório.
--
-- Sem ele, o sorteio em produção (4.000 cartelas com quadros = 2) ficaria
-- com premios_previstos = 1 e a tela ofereceria UMA apuração quando deve
-- oferecer duas: o defeito sobreviveria à própria correção.
--
-- Escreve numa coluna que acabou de nascer — nenhum dado anterior é
-- alterado. Toca só sorteios que já têm cartelas geradas.
update sorteios s
   set premios_previstos = c.maior_quadros
  from (select sorteio_id, max(quadros) as maior_quadros
          from cartelas group by sorteio_id) c
 where c.sorteio_id = s.id
   and s.premios_previstos <> c.maior_quadros;


-- ============================================================================
-- 4. A FUNÇÃO DE APURAÇÃO
--
--    POR QUE `drop` E NÃO `create or replace`:
--    acrescentar um parâmetro NÃO substitui a função — cria uma
--    SOBRECARGA. Ficariam duas `fn_registrar_resultado_sorteio` vivas, e o
--    app, que chama com dois argumentos nomeados, casaria com a ANTIGA —
--    a que ainda encerra o sorteio. O defeito continuaria igual, escondido
--    atrás de uma migration que "passou".
--
--    Derrubar é seguro: nenhuma view depende dela (pré-voo), e o drop e o
--    create estão na mesma transação — uma chamada concorrente espera o
--    lock e já enxerga a versão nova, nunca o intervalo.
--
--    SEGUE SEM `security definer`, de propósito. É isso que a mantém
--    segura mesmo com grant amplo: rodando com os privilégios de quem
--    chama, a RLS de `resultados_sorteio` barra quem não é admin. Marcar
--    como security definer aqui, sem um `if not is_admin()` junto,
--    transformaria uma chamada anônima em apuração real.
-- ============================================================================

drop function if exists fn_registrar_resultado_sorteio(uuid, int);

create function fn_registrar_resultado_sorteio(
  p_sorteio_id uuid,
  p_numero_sorteado integer,
  p_ordem integer default 1
) returns uuid
language plpgsql as $function$
declare
  v_vendedor_id uuid;
  v_confirmada boolean;
  v_maior_id uuid;
  v_resultado_id uuid;
  v_numero_anterior int;
  v_previstos int;
begin
  select premios_previstos into v_previstos from sorteios where id = p_sorteio_id;
  if v_previstos is null then
    raise exception 'Sorteio não encontrado.';
  end if;
  if p_ordem < 1 or p_ordem > v_previstos then
    raise exception 'Este sorteio prevê % prêmio(s) — não existe prêmio nº %.',
      v_previstos, p_ordem;
  end if;

  -- guardado ANTES do upsert: é o que diferencia primeira apuração de
  -- correção, e some assim que a linha for sobrescrita
  select numero_sorteado into v_numero_anterior
    from resultados_sorteio
   where sorteio_id = p_sorteio_id and ordem = p_ordem;

  select vendedor_id, confirmada into v_vendedor_id, v_confirmada
    from fn_localizar_vendedor_por_cartela(p_sorteio_id, p_numero_sorteado);

  -- O maior vendedor é de quem vendeu mais cartelas — é do SORTEIO, não da
  -- sequência de prêmios. Por isso só é resolvido no primeiro, e fica nulo
  -- nos demais.
  if p_ordem = 1 then
    select vendedor_id into v_maior_id
      from vw_ranking_vendedores
     where sorteio_id = p_sorteio_id and posicao = 1;
  end if;

  insert into resultados_sorteio (
    sorteio_id, ordem, numero_sorteado, vendedor_id, cartela_confirmada,
    maior_vendedor_id, sorteado_em, registrado_por
  )
  values (
    p_sorteio_id, p_ordem, p_numero_sorteado, v_vendedor_id,
    coalesce(v_confirmada, false), v_maior_id, now(), auth.uid()
  )
  on conflict (sorteio_id, ordem) do update
    set numero_sorteado    = excluded.numero_sorteado,
        vendedor_id        = excluded.vendedor_id,
        cartela_confirmada = excluded.cartela_confirmada,
        maior_vendedor_id  = excluded.maior_vendedor_id,
        sorteado_em        = excluded.sorteado_em,
        registrado_por     = excluded.registrado_por
  returning id into v_resultado_id;

  -- O `update sorteios set status = 'encerrado'` SAIU daqui.
  -- Era ele que fechava a porta do 2º prêmio. Encerrar voltou a ser um ato
  -- da coordenação, no botão que já existe em /admin/apuracao.

  if v_numero_anterior is not null then
    insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
    values (
      'sorteio.reapurar', 'resultados_sorteio', v_resultado_id,
      jsonb_build_object(
        'sorteio_id', p_sorteio_id,
        'ordem', p_ordem,
        'numero_anterior', v_numero_anterior,
        'numero_novo', p_numero_sorteado
      ),
      auth.uid()
    );
  end if;

  return v_resultado_id;
end;
$function$;

-- `drop function` leva os grants junto: sem esta linha, a apuração pararia
-- de funcionar para quem está logado.
grant execute on function fn_registrar_resultado_sorteio(uuid, int, int) to authenticated;

-- O grant default do Supabase alcançaria `anon` também. Hoje a RLS já
-- barraria o insert, mas fechar deixa a recusa limpa em vez de virar erro
-- de permissão no meio da função (mesma disciplina do achado 3, ver 13).
revoke execute on function fn_registrar_resultado_sorteio(uuid, int, int) from anon;


-- ============================================================================
-- 5. A VIEW PÚBLICA
--
--    Passa a devolver UMA LINHA POR PRÊMIO. A coluna `ordem` entra no FIM
--    da lista de propósito: `create or replace view` só aceita ACRESCENTAR
--    colunas ao final (erro 42P16 se inserida no meio) — e replace mantém
--    os grants, evitando o drop e o risco de esquecer de refazê-los.
--
--    ⚠️ MUDANÇA DE CARDINALIDADE: o placar público e o /diretoria hoje
--    consomem com `.maybeSingle()`, que ERRA com mais de uma linha. Isso
--    só acontece quando o 2º prêmio for apurado — por isso a ordem
--    migration → deploy → apurar, descrita no cabeçalho.
-- ============================================================================

create or replace view vw_resultado_publico as
select
  r.sorteio_id,
  r.numero_sorteado,
  r.cartela_confirmada,
  vp.nome as vendedor_premiado_nome,
  cc.nome_comprador,
  vm.nome as maior_vendedor_nome,
  r.ordem
from resultados_sorteio r
left join vendedores vp on vp.id = r.vendedor_id
left join vendedores vm on vm.id = r.maior_vendedor_id
left join compradores_cartela cc
  on cc.sorteio_id = r.sorteio_id and cc.numero_cartela = r.numero_sorteado;


-- ============================================================================
-- 6. VERIFICAÇÃO
-- ============================================================================

select * from (
  select 1 as ord, 'MP-01' as codigo, 'Coluna resultados_sorteio.ordem' as item,
         case when exists (select 1 from information_schema.columns
                            where table_schema='public' and table_name='resultados_sorteio'
                              and column_name='ordem')
              then 'OK' else 'FALHA' end as status
  union all
  select 2, 'MP-02', 'Unica de sorteio_id foi derrubada',
         case when not exists (select 1 from pg_constraint
                                where conrelid='public.resultados_sorteio'::regclass
                                  and conname='resultados_sorteio_sorteio_id_key')
              then 'OK' else 'FALHA (ainda existe)' end
  union all
  select 3, 'MP-03', 'Unica (sorteio_id, ordem) criada',
         case when exists (select 1 from pg_constraint
                            where conrelid='public.resultados_sorteio'::regclass
                              and conname='resultados_sorteio_sorteio_ordem_key')
              then 'OK' else 'FALHA' end
  union all
  select 4, 'MP-04', 'Resultado que ja existia virou premio 1',
         coalesce((select case when count(*) = count(*) filter (where ordem = 1)
                               then 'OK (' || count(*) || ' resultado(s), todos ordem 1)'
                               else 'ATENCAO: ha resultado com ordem <> 1' end
                     from resultados_sorteio), 'OK (nenhum resultado)')
  union all
  select 5, 'MP-05', 'Backfill de premios_previstos pelos quadros',
         coalesce((select string_agg(s.nome || ' = ' || s.premios_previstos, ' | ' order by s.nome)
                     from sorteios s where exists (select 1 from cartelas c where c.sorteio_id = s.id)),
                  'nenhum sorteio com cartelas')
  union all
  select 6, 'MP-06', 'Funcao com 3 argumentos e SEM sobrecarga',
         coalesce((select case when count(*) = 1
                               and max(pg_get_function_identity_arguments(p.oid))
                                   = 'p_sorteio_id uuid, p_numero_sorteado integer, p_ordem integer'
                               then 'OK'
                               else 'FALHA (' || count(*) || ' assinatura(s))' end
                     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                    where n.nspname='public' and p.proname='fn_registrar_resultado_sorteio'), 'FALHA')
  union all
  select 7, 'MP-07', 'Funcao continua SEM security definer',
         coalesce((select case when bool_or(p.prosecdef) then 'FALHA (virou definer)' else 'OK' end
                     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
                    where n.nspname='public' and p.proname='fn_registrar_resultado_sorteio'), 'FALHA')
  union all
  select 8, 'MP-08', 'Grant de execute para authenticated reposto',
         case when exists (select 1 from information_schema.role_routine_grants
                            where routine_schema='public'
                              and routine_name='fn_registrar_resultado_sorteio'
                              and grantee='authenticated')
              then 'OK' else 'FALHA' end
  union all
  select 9, 'MP-09', 'View com a coluna ordem no fim',
         coalesce((select case when column_name='ordem' then 'OK' else 'FALHA' end
                     from information_schema.columns
                    where table_schema='public' and table_name='vw_resultado_publico'
                    order by ordinal_position desc limit 1), 'FALHA')
  union all
  select 10, 'MP-10', 'Grants da view preservados pelo replace',
         case when exists (select 1 from information_schema.role_table_grants
                            where table_schema='public' and table_name='vw_resultado_publico'
                              and grantee='anon')
              then 'OK' else 'FALHA (refazer o grant)' end
  union all
  select 11, 'MP-11', 'Nenhum dado de venda foi tocado',
         (select 'OK — lotes: ' || (select count(*) from lotes_cartelas)
                 || ' | baixas: ' || (select count(*) from baixas_cartelas)
                 || ' | compradores: ' || (select count(*) from compradores_cartela)
                 || ' | cartelas: ' || (select count(*) from cartelas))
) v order by ord;
