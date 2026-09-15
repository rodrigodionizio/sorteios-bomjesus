-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v10-correcoes-inspecao.sql (aplicada em produção em 25/08/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 10: correção de três achados da inspeção do banco de 11/08/2026
-- (ver "Achados da inspeção do banco" em 13-roadmap-e-pendencias.md).
--
--   1. Telefone do vendedor exposto ao público via `vw_ranking_vendedores`
--   3. `fn_vincular_vendedor_interno` chamável por anon/authenticated
--   4. Nenhum superadmin existe — o papel é inalcançável
--
-- O achado 2 (Realtime nunca configurado) NÃO entra aqui: depende de uma
-- decisão sobre abrir leitura de lotes_cartelas/baixas_cartelas para `anon`.
-- O achado 5 (grants amplos do Supabase) também não: é higiene de baixa
-- urgência e exige conferir tela por tela depois.
--
-- Pré-requisitos: schema-v1 a schema-v9 aplicados.
-- Rode o arquivo inteiro, de uma vez, no SQL Editor do Supabase.
-- ============================================================================


-- ============================================================================
-- 1. TELEFONE FORA DA VIEW PÚBLICA
--
-- `vw_ranking_vendedores` tinha a coluna `telefone` e `grant select` para
-- `anon`. A página do placar nunca a selecionou — mas isso protege a TELA,
-- não o DADO: a chave anônima está no bundle do navegador, então qualquer
-- pessoa podia chamar a API REST direto e ler o telefone de todo mundo.
-- Mesma classe do bug do `maskPhone()` (ver 13), uma camada abaixo.
--
-- Por que `drop view` e não `create or replace`: replace só permite
-- ACRESCENTAR colunas ao fim — remover uma dá erro 42P16 ("cannot change
-- name of view column"). Como o drop leva junto os grants, eles são
-- refeitos logo abaixo.
--
-- Nenhuma view depende desta, então o drop não precisa de `cascade`.
-- `fn_registrar_resultado_sorteio` consulta a view dentro do corpo, mas
-- isso é resolvido em tempo de execução (plpgsql), não é dependência de
-- catálogo — a função continua funcionando sem ser recriada.
-- ============================================================================

drop view if exists vw_ranking_vendedores;

create view vw_ranking_vendedores as
with reservas as (
  select sorteio_id, vendedor_id, sum(quantidade) as total_reservado
  from lotes_cartelas
  where status = 'ativo'
  group by sorteio_id, vendedor_id
),
vendas as (
  select l.sorteio_id, l.vendedor_id, sum(b.quantidade) as total_vendido,
         max(b.created_at) as ultima_baixa
  from baixas_cartelas b
  join lotes_cartelas l on l.id = b.lote_id
  group by l.sorteio_id, l.vendedor_id
)
select
  r.sorteio_id,
  v.id as vendedor_id,
  v.nome,
  -- `v.telefone` REMOVIDO de propósito. Quem precisa do telefone é a área
  -- administrativa, e ela lê direto de `vendedores` (protegida por RLS).
  -- Não reintroduza a coluna aqui "para reaproveitar a view".
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

grant select on vw_ranking_vendedores to anon, authenticated;


-- ============================================================================
-- 3. FECHAR `fn_vincular_vendedor_interno`
--
-- O desenho da migration 3 é explícito: a variante `_interno` recebe o
-- `user_id` como PARÂMETRO, então quem puder chamá-la consegue vincular um
-- cadastro de vendedor à conta de outra pessoa. Por isso o arquivo original
-- não dá grant nenhum a ela.
--
-- Só que o Supabase aplica, por padrão, `grant execute on all functions in
-- schema public to anon, authenticated` — e isso alcançou a função também,
-- desfazendo a proteção sem ninguém escrever uma linha de SQL.
--
-- A variante pública (`fn_vincular_vendedor`) continua liberada: ela deriva
-- o user_id do próprio `auth.uid()` da sessão, que é o ponto todo.
-- ============================================================================

revoke execute on function fn_vincular_vendedor_interno(uuid, text, text, text)
  from anon, authenticated;

-- `handle_new_user()` é função de trigger: chamá-la direto já falha
-- ("trigger functions can only be called as triggers"), mas não custa
-- fechar o que não precisa estar aberto.
revoke execute on function handle_new_user() from anon, authenticated;


-- ============================================================================
-- 4. CRIAR O PRIMEIRO SUPERADMIN
--
-- Situação encontrada: `perfis` tem uma única linha, com role = 'admin'. O
-- convite-seed de superadmin da migration 3 nunca foi aceito, porque
-- `handle_new_user()` só dispara no INSERT em auth.users — e a conta já
-- existia quando aquela migration rodou.
--
-- Impasse: `alterar_papel()` exige `is_superadmin()`. Sem nenhum superadmin,
-- ninguém pode promover ninguém, inclusive para sair da situação. A única
-- saída é por aqui.
--
-- ATENÇÃO ao trigger: `trg_perfil_role_protect` (função
-- `enforce_perfil_alteracoes`) barra **duas** coisas, não uma:
--   linha 4  — mudar `role` sem ser superadmin;
--   linha 9  — mudar `email` ou `nome` sem ser admin.
-- No SQL Editor `auth.uid()` é nulo, então `is_admin()` e `is_superadmin()`
-- devolvem false e os DOIS updates abaixo seriam recusados. Por isso ambos
-- ficam dentro da janela com o trigger desligado — inclusive o backfill de
-- e-mail, que numa primeira versão deste arquivo estava depois do `enable`
-- e derrubava o script com
-- "P0001: Você só pode alterar seu nome de exibição e cargo".
--
-- O SQL Editor roda o arquivo inteiro numa transação só: se algo falhar no
-- meio, nada é aplicado — e rodar o arquivo de novo do zero é seguro
-- (todas as operações aqui são idempotentes).
--
-- Se você interromper o script manualmente, confira que o trigger voltou:
--   select tgenabled from pg_trigger where tgname = 'trg_perfil_role_protect';
--   -- 'O' = habilitado, 'D' = desabilitado
-- ============================================================================

alter table perfis disable trigger trg_perfil_role_protect;

-- Busca pelo id em auth.users, não por perfis.email: aquela coluna pode
-- estar nula nos perfis criados à mão, antes da migration 3.
update perfis
   set role = 'superadmin'
 where id = (select id from auth.users where email = 'rodrigo.dionizio@gmail.com');

-- Preenche `email` nos perfis antigos (criados por insert manual, sem a
-- coluna). É o que /admin/usuarios mostra na tabela de administradores.
update perfis p
   set email = u.email
  from auth.users u
 where u.id = p.id and p.email is null;

alter table perfis enable trigger trg_perfil_role_protect;

-- O convite-seed de superadmin fica pendente para sempre (a conta com
-- aquele e-mail já existe, então nenhum INSERT em auth.users vai acontecer
-- para dispará-lo). Marcar como aceito tira ele da lista de "Convites
-- pendentes" sem apagar o registro histórico de que ele existiu.
update convites
   set aceito_em = now()
 where role = 'superadmin'
   and aceito_em is null
   and exists (select 1 from auth.users u where u.email = convites.email);


-- ============================================================================
-- CONFERÊNCIA — rode depois e confira as quatro linhas:
--
--   -- (a) a view não pode mais ter a coluna telefone → 0 linhas
--   select column_name from information_schema.columns
--    where table_name = 'vw_ranking_vendedores' and column_name = 'telefone';
--
--   -- (b) _interno não pode ter grant para anon/authenticated → 0 linhas
--   select grantee from information_schema.role_routine_grants
--    where routine_name = 'fn_vincular_vendedor_interno'
--      and grantee in ('anon', 'authenticated');
--
--   -- (c) precisa existir exatamente um superadmin → 1 linha
--   select role, count(*) from perfis group by role;
--
--   -- (d) o trigger precisa estar de volta → tgenabled = 'O'
--   select tgname, tgenabled from pg_trigger
--    where tgname = 'trg_perfil_role_protect';
--
-- Depois disso, `documentacao/sql/inspecao-estado-do-banco.sql` pode ser
-- rodado de novo para conferir o estado inteiro.
-- ============================================================================
