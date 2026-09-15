-- ============================================================================
-- PRÉ-VOO da migration 13 (múltiplos prêmios) — SOMENTE LEITURA.
--
-- Não altera nada. Roda em produção sem risco, a qualquer hora.
--
-- PARA QUE SERVE: a migration 13 mexe em três coisas sensíveis — troca uma
-- constraint única, DERRUBA e recria uma função, e muda a cardinalidade de
-- uma view que o placar público consome. Nenhuma dessas decisões deve ser
-- tomada no escuro. Este script responde, com o banco real, as perguntas
-- que decidem se a migration é segura e em que ordem executá-la.
--
-- COMO USAR: cole no SQL Editor, rode, e me devolva o JSON.
-- ============================================================================

select jsonb_build_object(

  'gerado_em', now(),

  -- ---------------------------------------------------------------------
  -- 1. JÁ EXISTE RESULTADO APURADO?
  --    Se for zero, a coluna `ordem` entra sem tocar em linha nenhuma e a
  --    troca de constraint é trivial. Se houver linhas, cada uma vira o
  --    prêmio nº 1 do seu sorteio (o `default 1` cuida disso) — e aí vale
  --    conferir se é isso mesmo que se espera.
  -- ---------------------------------------------------------------------
  'resultados', jsonb_build_object(
    'total', (select count(*) from resultados_sorteio),
    'por_sorteio', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'sorteio', s.nome, 'numero_sorteado', r.numero_sorteado,
        'tem_maior_vendedor', r.maior_vendedor_id is not null,
        'sorteado_em', r.sorteado_em
      )), '[]'::jsonb)
      from resultados_sorteio r join sorteios s on s.id = r.sorteio_id
    )
  ),

  -- ---------------------------------------------------------------------
  -- 2. O QUE HÁ EM CADA SORTEIO
  --    Para separar o "Sorteio Teste" (descartável) do que está em
  --    produção, e para saber o que um eventual delete arrastaria junto.
  --    ATENÇÃO: `lotes_cartelas` NÃO tem `on delete cascade` — apagar um
  --    sorteio com lotes falha por violação de FK. Só `cartelas` cascateia.
  -- ---------------------------------------------------------------------
  'sorteios', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nome', s.nome,
      'status', s.status,
      'modalidade', s.modalidade,
      'faixa', s.cartela_min || '-' || s.cartela_max,
      'tem_chave_pix', s.pix_chave_id is not null,
      'lotes', (select count(*) from lotes_cartelas l where l.sorteio_id = s.id),
      'baixas', (select count(*) from baixas_cartelas b
                  join lotes_cartelas l on l.id = b.lote_id where l.sorteio_id = s.id),
      'compradores', (select count(*) from compradores_cartela c where c.sorteio_id = s.id),
      'cartelas', (select count(*) from cartelas c where c.sorteio_id = s.id),
      -- Mais de um valor aqui = cartelas com números de chances diferentes
      -- no mesmo sorteio. Ver seção 3 do arquivo 16.
      'quadros_distintos', (
        select coalesce(jsonb_agg(distinct c.quadros), '[]'::jsonb)
        from cartelas c where c.sorteio_id = s.id
      )
    ) order by s.created_at), '[]'::jsonb)
    from sorteios s
  ),

  -- ---------------------------------------------------------------------
  -- 3. O NOME REAL DA CONSTRAINT A SER TROCADA
  --    A migration precisa derrubar a única de `sorteio_id`. Derrubar pelo
  --    nome errado falha; pior, derrubar a errada quebraria a integridade.
  -- ---------------------------------------------------------------------
  'constraints_resultados', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nome', conname, 'definicao', pg_get_constraintdef(oid)
    )), '[]'::jsonb)
    from pg_constraint where conrelid = 'public.resultados_sorteio'::regclass
  ),

  -- ---------------------------------------------------------------------
  -- 4. QUANTAS VERSÕES DA FUNÇÃO EXISTEM
  --    Se aparecer mais de uma assinatura, já existe sobrecarga e o
  --    PostgREST pode estar chamando a que ninguém espera. A migration
  --    precisa derrubar TODAS antes de criar a nova.
  -- ---------------------------------------------------------------------
  'funcao_apuracao', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'assinatura', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'grants', (
        select coalesce(jsonb_agg(distinct g.grantee), '[]'::jsonb)
        from information_schema.role_routine_grants g
        where g.routine_schema = 'public'
          and g.routine_name = 'fn_registrar_resultado_sorteio'
          and g.grantee in ('anon', 'authenticated')
      )
    )), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_registrar_resultado_sorteio'
  ),

  -- ---------------------------------------------------------------------
  -- 5. QUEM DEPENDE DA VIEW QUE MUDA DE CARDINALIDADE
  --    `create or replace view` falha se alguma outra view depender dela.
  --    E os grants precisam ser refeitos se for preciso dropar.
  -- ---------------------------------------------------------------------
  'view_resultado_publico', jsonb_build_object(
    'existe', to_regclass('public.vw_resultado_publico') is not null,
    'grants', (
      select coalesce(jsonb_agg(distinct grantee), '[]'::jsonb)
      from information_schema.role_table_grants
      where table_schema = 'public' and table_name = 'vw_resultado_publico'
        and grantee in ('anon', 'authenticated')
    ),
    'views_dependentes', (
      select coalesce(jsonb_agg(distinct dependente.relname), '[]'::jsonb)
      from pg_depend d
      join pg_rewrite r on r.oid = d.objid
      join pg_class dependente on dependente.oid = r.ev_class
      where d.refobjid = to_regclass('public.vw_resultado_publico')
        and dependente.relname <> 'vw_resultado_publico'
    )
  ),

  -- ---------------------------------------------------------------------
  -- 6. A COLUNA JÁ EXISTE? (a migration é idempotente, mas é bom saber)
  -- ---------------------------------------------------------------------
  'colunas_ja_existentes', jsonb_build_object(
    'resultados_sorteio_ordem', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'resultados_sorteio'
        and column_name = 'ordem'),
    'sorteios_premios_previstos', exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'sorteios'
        and column_name = 'premios_previstos')
  )

) as preflight_v13;
