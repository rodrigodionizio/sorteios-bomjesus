-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v9-reapuracao.sql (aplicada em produção em 11/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 9: reapuração — `fn_registrar_resultado_sorteio` passa a fazer
-- upsert em vez de falhar na segunda chamada, para que um número digitado
-- errado possa ser corrigido pela tela (/admin/apuracao) em vez de exigir
-- intervenção direta no banco.
--
-- ORIGEM DESTE ARQUIVO: esta alteração foi aplicada direto no SQL Editor de
-- produção e ficou por um tempo sem arquivo correspondente. O corpo abaixo
-- foi extraído do banco real em 11/08/2026 com
-- `pg_get_functiondef('fn_registrar_resultado_sorteio(uuid,int)'::regprocedure)`
-- — não é uma reconstrução de memória. Rodar este arquivo num banco que já
-- está em produção é inofensivo (substitui a função por ela mesma).
--
-- Pré-requisito: schema-v1.sql (função original) e
-- schema-v3-usuarios-perfis-vendedores.sql (tabela `eventos_auditoria`).
-- ============================================================================

create or replace function fn_registrar_resultado_sorteio(
  p_sorteio_id uuid,
  p_numero_sorteado integer
) returns uuid
language plpgsql as $function$
declare
  v_vendedor_id uuid;
  v_confirmada boolean;
  v_maior_id uuid;
  v_resultado_id uuid;
  v_numero_anterior int;
begin
  -- guardado ANTES do upsert: é o que diferencia "primeira apuração" de
  -- "correção", e some assim que a linha for sobrescrita
  select numero_sorteado into v_numero_anterior
  from resultados_sorteio where sorteio_id = p_sorteio_id;

  select vendedor_id, confirmada into v_vendedor_id, v_confirmada
  from fn_localizar_vendedor_por_cartela(p_sorteio_id, p_numero_sorteado);

  select vendedor_id into v_maior_id
  from vw_ranking_vendedores
  where sorteio_id = p_sorteio_id and posicao = 1;

  insert into resultados_sorteio (
    sorteio_id, numero_sorteado, vendedor_id, cartela_confirmada,
    maior_vendedor_id, sorteado_em, registrado_por
  )
  values (
    p_sorteio_id, p_numero_sorteado, v_vendedor_id, coalesce(v_confirmada, false),
    v_maior_id, now(), auth.uid()
  )
  -- `resultados_sorteio.sorteio_id` é unique (schema-v1): sem este
  -- `on conflict`, a segunda apuração do mesmo sorteio falhava com
  -- violação de unicidade. Todos os campos são recalculados, não só o
  -- número — o vendedor premiado e o maior vendedor mudam junto.
  on conflict (sorteio_id) do update
    set numero_sorteado    = excluded.numero_sorteado,
        vendedor_id        = excluded.vendedor_id,
        cartela_confirmada = excluded.cartela_confirmada,
        maior_vendedor_id  = excluded.maior_vendedor_id,
        sorteado_em        = excluded.sorteado_em,
        registrado_por     = excluded.registrado_por
  returning id into v_resultado_id;

  update sorteios set status = 'encerrado' where id = p_sorteio_id;

  -- só grava evento quando é REapuração: a primeira apuração já fica
  -- registrada na própria linha de resultados_sorteio
  if v_numero_anterior is not null then
    insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
    values (
      'sorteio.reapurar',
      'resultados_sorteio',
      v_resultado_id,
      jsonb_build_object(
        'sorteio_id', p_sorteio_id,
        'numero_anterior', v_numero_anterior,
        'numero_novo', p_numero_sorteado
      ),
      auth.uid()
    );
  end if;

  return v_resultado_id;
end;
$function$;

-- ============================================================================
-- Observação registrada na inspeção, NÃO corrigida aqui de propósito:
--
-- Esta função continua sem `security definer` e sem `set search_path` — ao
-- contrário de todas as funções da migration 3. E é justamente isso que a
-- mantém segura hoje: como ela roda com os privilégios de quem chama, a RLS de
-- `resultados_sorteio` e `sorteios` é aplicada normalmente, e um `anon` que
-- chamasse esta função (o grant default do Supabase permite — ver
-- 13-roadmap-e-pendencias.md) receberia erro de permissão no insert.
--
-- Mudar para `security definer` sem antes acrescentar uma checagem
-- `if not is_admin() then raise exception ...` transformaria uma chamada
-- anônima em apuração real. Se algum dia essa mudança for feita, a checagem
-- precisa vir junto, no mesmo commit.
-- ============================================================================
