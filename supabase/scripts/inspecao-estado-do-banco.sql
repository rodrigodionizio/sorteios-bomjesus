-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- INSPEÇÃO DO ESTADO DO BANCO — não é uma migration.
--
-- Este arquivo NÃO altera nada: é só `select` em catálogo do Postgres.
-- Pode rodar em produção, a qualquer hora, quantas vezes quiser.
--
-- PARA QUE SERVE: descobrir o que de fato está aplicado no banco hoje —
-- inclusive alterações feitas direto no SQL Editor que nunca viraram
-- arquivo (o caso conhecido é `fn_registrar_resultado_sorteio`, ver
-- 13-roadmap-e-pendencias.md). Serve também como conferência antes de
-- escrever qualquer migration nova.
--
-- O QUE ELE LÊ: estrutura (tabelas, colunas, constraints, índices,
-- views, funções, triggers, políticas de RLS, grants, publicação do
-- Realtime, buckets de Storage) e CONTAGENS agregadas.
--
-- O QUE ELE NÃO LÊ: nenhum dado de nenhuma linha. Nenhum nome, telefone,
-- e-mail, código de vínculo, código da diretoria ou contato de
-- comprador sai daqui — só o desenho do banco. Por isso a saída pode ser
-- compartilhada sem risco de vazar dado pessoal.
--
-- COMO USAR (Supabase → SQL Editor):
--   1. Cole o SCRIPT 1 inteiro e rode.
--   2. O resultado é uma única célula chamada `estado_do_banco`.
--      Clique nela para expandir e copiar, ou use "Download CSV".
--   3. É um JSON — não precisa formatar nada, cole como veio.
-- ============================================================================


-- ============================================================================
-- SCRIPT 1 — Estado completo (rode este)
-- ============================================================================

select jsonb_build_object(

  'gerado_em', now(),
  'versao_postgres', current_setting('server_version'),

  -- extensões instaladas (btree_gist é a que sustenta as exclusion constraints)
  'extensoes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nome', e.extname, 'versao', e.extversion, 'schema', n.nspname
    ) order by e.extname), '[]'::jsonb)
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
  ),

  -- tabelas: colunas, constraints, índices, se a RLS está ligada e o
  -- volume aproximado (n_live_tup é estimativa do planner, não `count(*)`)
  'tabelas', (
    select coalesce(jsonb_agg(x.t order by x.t ->> 'tabela'), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'tabela', c.relname,
        'rls_ativa', c.relrowsecurity,
        'linhas_aprox', coalesce(s.n_live_tup, 0),
        'colunas', (
          select jsonb_agg(jsonb_build_object(
            'nome', a.attname,
            'tipo', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull,
            'default', pg_get_expr(ad.adbin, ad.adrelid),
            'gerada', a.attgenerated <> ''
          ) order by a.attnum)
          from pg_attribute a
          left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
          where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
        ),
        'constraints', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'nome', con.conname, 'definicao', pg_get_constraintdef(con.oid)
          ) order by con.conname), '[]'::jsonb)
          from pg_constraint con where con.conrelid = c.oid
        ),
        'indices', (
          select coalesce(jsonb_agg(i.indexdef order by i.indexname), '[]'::jsonb)
          from pg_indexes i
          where i.schemaname = 'public' and i.tablename = c.relname
        )
      ) as t
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_stat_user_tables s on s.relid = c.oid
      where n.nspname = 'public' and c.relkind = 'r'
    ) x
  ),

  -- views: a definição que o Postgres devolve já vem normalizada
  -- (é o que está rodando, não o que o arquivo .sql dizia)
  'views', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nome', c.relname,
      'definicao', pg_get_viewdef(c.oid, true)
    ) order by c.relname), '[]'::jsonb)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
  ),

  -- funções: o corpo completo. É AQUI que aparece se
  -- fn_registrar_resultado_sorteio já faz upsert.
  -- O `not exists (pg_depend ... deptype = 'e')` descarta as funções que
  -- vieram junto de extensões (btree_gist sozinho traz dezenas).
  'funcoes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'nome', p.proname,
      'argumentos', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'volatilidade', p.provolatile,
      'search_path', p.proconfig,
      'definicao', pg_get_functiondef(p.oid)
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  ),

  -- triggers: inclui o schema `auth`, onde vive on_auth_user_created
  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'tabela', c.relname,
      'nome', tg.tgname,
      'definicao', pg_get_triggerdef(tg.oid)
    ) order by n.nspname, c.relname, tg.tgname), '[]'::jsonb)
    from pg_trigger tg
    join pg_class c on c.oid = tg.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not tg.tgisinternal
      and n.nspname in ('public', 'auth', 'storage')
  ),

  -- políticas de RLS, incluindo as do bucket de comprovantes
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname,
      'tabela', tablename,
      'nome', policyname,
      'permissiva', permissive,
      'papeis', roles,
      'comando', cmd,
      'using', qual,
      'with_check', with_check
    ) order by schemaname, tablename, policyname), '[]'::jsonb)
    from pg_policies
    where schemaname in ('public', 'storage')
  ),

  -- grants de tabela/view para os papéis que o app usa
  'grants_tabelas', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'objeto', g.table_name, 'papel', g.grantee, 'privilegios', g.privs
    ) order by g.table_name, g.grantee), '[]'::jsonb)
    from (
      select table_name, grantee,
             string_agg(distinct privilege_type, ',' order by privilege_type) as privs
      from information_schema.role_table_grants
      where table_schema = 'public' and grantee in ('anon', 'authenticated')
      group by table_name, grantee
    ) g
  ),

  -- grants de execute — quem pode CHAMAR cada função
  -- (a permissão de verdade é a checagem is_admin() dentro do corpo)
  'grants_funcoes', (
    select coalesce(jsonb_agg(distinct jsonb_build_object(
      'funcao', routine_name, 'papel', grantee
    )), '[]'::jsonb)
    from information_schema.role_routine_grants
    where routine_schema = 'public' and grantee in ('anon', 'authenticated')
  ),

  -- quais tabelas estão na publicação do Realtime.
  -- Sem a tabela aqui, o navegador assina e nunca recebe evento.
  'realtime_publicacao', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'publicacao', pubname, 'tabela', schemaname || '.' || tablename
    ) order by pubname, schemaname, tablename), '[]'::jsonb)
    from pg_publication_tables
  ),

  -- buckets de Storage (o `comprovantes` precisa estar com public = false)
  'storage_buckets', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'publico', public,
      'limite_bytes', file_size_limit,
      'mime_permitidos', allowed_mime_types
    ) order by id), '[]'::jsonb)
    from storage.buckets
  ),

  -- contagens agregadas: nenhum dado individual, só "quantos".
  -- Mostra se o login com Google está sendo usado de fato e como os
  -- papéis estão distribuídos.
  'contas', jsonb_build_object(
    'total_usuarios_auth', (select count(*) from auth.users),
    'identidades_por_provedor', (
      select coalesce(jsonb_object_agg(p.provider, p.qtd), '{}'::jsonb)
      from (select provider, count(*) as qtd from auth.identities group by provider) p
    ),
    'perfis_por_papel', (
      select coalesce(jsonb_object_agg(r.role, r.qtd), '{}'::jsonb)
      from (select role, count(*) as qtd from public.perfis group by role) r
    ),
    'vendedores_com_conta', (
      select count(*) from public.vendedores where user_id is not null
    ),
    'vendedores_total', (select count(*) from public.vendedores)
  )

) as estado_do_banco;


-- ============================================================================
-- SCRIPT 2 (opcional) — atalho para a pendência conhecida
--
-- Se você só quiser conferir rapidamente a função da reapuração sem
-- rodar o inventário inteiro. Se o corpo tiver `on conflict (sorteio_id)`,
-- a reapuração está aplicada no banco; se for um `insert` puro, não está.
-- ============================================================================

-- select pg_get_functiondef('public.fn_registrar_resultado_sorteio(uuid, int)'::regprocedure);


-- ============================================================================
-- SCRIPT 3 (opcional) — conferência rápida, legível por humano
--
-- Uma linha por objeto, sem os corpos das funções. Útil para bater o
-- olho e ver se falta alguma coisa, sem copiar nada para lugar nenhum.
-- ============================================================================

-- select 'tabela'  as tipo, c.relname as nome, case when c.relrowsecurity then 'RLS on' else 'RLS OFF' end as obs
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r'
-- union all
-- select 'view', c.relname, ''
--   from pg_class c join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'v'
-- union all
-- select 'funcao', p.proname, case when p.prosecdef then 'security definer' else '' end
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.prokind = 'f'
--    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
-- union all
-- select 'trigger', tg.tgname, c.relname
--   from pg_trigger tg join pg_class c on c.oid = tg.tgrelid
--   join pg_namespace n on n.oid = c.relnamespace
--  where not tg.tgisinternal and n.nspname in ('public', 'auth')
-- order by 1, 2;
