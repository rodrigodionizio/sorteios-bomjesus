-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v3-usuarios-perfis-vendedores.sql (aplicada em produção em 28/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 3: papéis de acesso (superadmin/admin/vendedor), convite de
-- administradores, autoidentificação de vendedores (celular + código de
-- vínculo), solicitação de baixa e auditoria de identidade.
--
-- Recuperação de senha (C.13 em 14-roadmap-implementacoes-novas.md) não
-- entra aqui de propósito: é só `supabase.auth.resetPasswordForEmail()`
-- + uma rota no Next.js — não toca em nenhuma tabela nem RLS deste
-- projeto, não tem SQL para escrever.
--
-- Pré-requisito: schema-v1.sql e schema-v2-rls-policies.sql já aplicados.
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma única vez.
-- Não pode ser aplicado automaticamente por mim: preciso de credenciais de
-- banco (service_role ou senha do Postgres) que não estão disponíveis aqui.
--
-- Filosofia desta migration (por quê tanta coisa vira função, não Server
-- Action): toda mutação que mexe no acesso de alguém — trocar papel,
-- gerar/revogar vínculo, remover admin, cancelar convite, aprovar/rejeitar
-- solicitação — vira uma função `security definer` que valida permissão,
-- grava auditoria quando cabível, e só então escreve, tudo numa
-- transação só. O front-end nunca decide "posso fazer isso?" — só chama
-- a função e mostra o erro se o banco disser não. Isso é o que o pedido
-- de "menos código de front-end, mais segurança no banco" significa na
-- prática: a regra existe uma vez só, no lugar que não dá para pular.
-- ============================================================================


-- ============================================================================
-- 1. EVENTOS_AUDITORIA — "quem mexeu no acesso de quem, e quando"
--    Vem primeiro porque quase toda função de identidade abaixo grava aqui.
-- ============================================================================

create table if not exists eventos_auditoria (
  id            uuid primary key default gen_random_uuid(),
  acao          text not null,          -- ex.: 'perfil.alterar_papel', 'vendedor.desvincular'
  entidade      text,                   -- ex.: 'perfis', 'vendedores', 'convites'
  entidade_id   uuid,
  detalhes      jsonb,
  realizado_por uuid references auth.users(id),
  realizado_em  timestamptz not null default now()
);

alter table eventos_auditoria enable row level security;

create policy "admin le eventos" on eventos_auditoria
  for select to authenticated using (is_admin());

-- Sem nenhuma policy de insert/update/delete para `authenticated`, de
-- propósito: a única forma de gravar aqui é através de uma função
-- `security definer` (elas bypassam RLS pelo próprio desenho do Postgres).
-- Isso torna estruturalmente impossível uma mutação de identidade
-- "esquecer" de auditar — se não passou por uma função, não teve como
-- gravar o evento nem fazer a mutação em si.


-- ============================================================================
-- 2. CONVITES — como um administrador ganha acesso (sem Admin API, sem
--    service_role key — ver 06-seguranca-autenticacao-rls.md)
-- ============================================================================

create table if not exists convites (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  nome           text,
  role           text not null default 'admin' check (role in ('admin', 'superadmin')),
  convidado_por  uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  aceito_em      timestamptz
);

alter table convites enable row level security;

create policy "admin acessa convites" on convites
  for all to authenticated
  using (is_admin())
  with check (is_admin());

-- Criar convite não precisa de função própria: não é destrutivo nem mexe
-- em várias linhas, então uma policy de RLS (acima) já basta — o client
-- só faz `insert into convites (...)`.


-- ============================================================================
-- 3. FUNÇÃO AUXILIAR — gerador do código de vínculo do vendedor
--    Vem antes da alteração de `vendedores` porque é usada como DEFAULT
--    de uma coluna nova (todo vendedor já cadastrado ganha um código
--    retroativamente, sem precisar de UPDATE manual).
-- ============================================================================

create or replace function fn_gerar_codigo_vinculo()
returns text
language sql volatile as $$
  select upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
$$;

-- Sem `grant execute` explícito: funções novas são executáveis por
-- PUBLIC por padrão no Postgres, e esta não expõe nada sensível (só
-- gera uma string aleatória) — é usada como DEFAULT de coluna e dentro
-- de outras funções `security definer` abaixo.


-- ============================================================================
-- 4. PERFIS — múltiplos papéis, personalização
-- ============================================================================

alter table perfis add column if not exists email text;
alter table perfis add column if not exists display_name text;
alter table perfis add column if not exists cargo text;

alter table perfis drop constraint if exists perfis_role_check;
alter table perfis add constraint perfis_role_check
  check (role in ('superadmin', 'admin', 'vendedor'));


-- ============================================================================
-- 5. VENDEDORES — vínculo de conta
-- ============================================================================

alter table vendedores add column if not exists user_id uuid references auth.users(id) unique;
alter table vendedores add column if not exists email text;
alter table vendedores add column if not exists codigo_vinculo text unique default fn_gerar_codigo_vinculo();

-- A chance de colisão de dois códigos de 6 caracteres (36^6 ≈ 2,1 bilhões
-- de combinações) é desprezível no volume de vendedores deste sistema —
-- mesmo raciocínio já usado para colisão de cartelas de bingo (ver
-- 14-roadmap-implementacoes-novas.md, B.7). Se um dia isso deixar de ser
-- verdade, o próximo passo é lógica de novo sorteio em caso de conflito,
-- não redesenhar o formato do código.


-- ============================================================================
-- 6. is_admin() / is_superadmin() — quem é o quê
-- ============================================================================

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfis where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

create or replace function is_superadmin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and role = 'superadmin');
$$;


-- ============================================================================
-- 7. PROTEÇÃO DE COLUNAS SENSÍVEIS EM `perfis`
--    RLS trava LINHA; isto trava COLUNA — ninguém muda o próprio `role`
--    (nem admin), e ninguém muda `email`/`nome` de si mesmo fora de um
--    fluxo administrativo (só `display_name`/`cargo` são de livre edição
--    pelo dono da conta).
-- ============================================================================

create or replace function enforce_perfil_alteracoes()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not is_superadmin() then
    raise exception 'Só o superusuário pode alterar o papel de um perfil.';
  end if;

  if (new.email is distinct from old.email or new.nome is distinct from old.nome)
     and not is_admin() then
    raise exception 'Você só pode alterar seu nome de exibição e cargo.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_perfil_role_protect on perfis;
create trigger trg_perfil_role_protect
  before update on perfis
  for each row execute function enforce_perfil_alteracoes();


-- ============================================================================
-- 8. VÍNCULO DO VENDEDOR (celular + código)
--    Duas funções: a "_interno" faz o trabalho de fato e recebe o
--    user_id como parâmetro (só pode ser chamada por outra função
--    security definer, nunca direto pelo client); a pública deriva o
--    user_id do próprio auth.uid() da sessão — nunca aceita um "de quem
--    é a conta" vindo do client, o que fecharia a porta para alguém
--    tentar vincular a conta de outra pessoa passando o UUID dela.
-- ============================================================================

create or replace function fn_vincular_vendedor_interno(
  p_user_id uuid,
  p_email text,
  p_telefone text,
  p_codigo text
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_vendedor_id uuid;
  v_nome text;
begin
  if p_telefone is null or p_codigo is null then
    return false;
  end if;

  -- SELECT + UPDATE separados teriam uma janela de corrida: duas pessoas
  -- tentando vincular o mesmo celular+código ao mesmo tempo poderiam
  -- ambas passar pelo SELECT antes de qualquer UPDATE confirmar, e a
  -- segunda sobrescreveria o vínculo da primeira. Fazer tudo num único
  -- UPDATE com `user_id is null` no WHERE torna a checagem atômica: só
  -- a primeira transação a chegar consegue casar a linha — a segunda,
  -- rodando depois, já não encontra mais `user_id is null` para bater.
  update vendedores
    set user_id = p_user_id, email = p_email
    where regexp_replace(telefone, '\D', '', 'g') = regexp_replace(p_telefone, '\D', '', 'g')
      and codigo_vinculo = p_codigo
      and user_id is null
    returning id, nome into v_vendedor_id, v_nome;

  if v_vendedor_id is null then
    return false;
  end if;

  insert into perfis (id, nome, email, role, cargo)
  values (p_user_id, v_nome, p_email, 'vendedor', 'Vendedor(a)')
  on conflict (id) do nothing;

  return true;
end;
$$;

create or replace function fn_vincular_vendedor(p_telefone text, p_codigo text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  -- `auth.jwt()` lê o e-mail direto dos claims da sessão atual — evita
  -- depender de grant de SELECT em auth.users, que não é garantido para
  -- todo função `security definer` dependendo de quem a criou.
  return fn_vincular_vendedor_interno(auth.uid(), auth.jwt() ->> 'email', p_telefone, p_codigo);
end;
$$;

grant execute on function fn_vincular_vendedor(text, text) to authenticated;

-- `fn_vincular_vendedor_interno` não tem `grant execute` para
-- `authenticated` de propósito — só é chamável por outra função
-- `security definer` (a de cima, e o trigger `handle_new_user` abaixo).
-- Não existe caminho do client até ela passando um `p_user_id`
-- arbitrário.


-- ============================================================================
-- 9. handle_new_user() — o que acontece quando uma conta nasce no Auth
--    Dois caminhos: convite por e-mail (admin) e telefone+código nos
--    metadados do cadastro (vendedor, cadastro por e-mail/senha). Quem
--    entra com Google sem nenhum dos dois cai autenticado e sem
--    `perfis` — a tela cuida da mensagem, não o banco.
-- ============================================================================

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_convite convites%rowtype;
begin
  select * into v_convite
  from convites
  where email = new.email and aceito_em is null;

  if v_convite.id is not null then
    insert into perfis (id, nome, email, role)
    values (new.id, v_convite.nome, new.email, v_convite.role)
    on conflict (id) do nothing;

    update convites set aceito_em = now() where id = v_convite.id;
    return new;
  end if;

  if new.raw_user_meta_data ->> 'telefone' is not null
     and new.raw_user_meta_data ->> 'codigo_vinculo' is not null then
    perform fn_vincular_vendedor_interno(
      new.id,
      new.email,
      new.raw_user_meta_data ->> 'telefone',
      new.raw_user_meta_data ->> 'codigo_vinculo'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================================
-- 10. alterar_papel — só superadmin promove/rebaixa
-- ============================================================================

create or replace function alterar_papel(p_perfil_id uuid, p_novo_role text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_role_antigo text;
begin
  if not is_superadmin() then
    raise exception 'Só o superusuário pode alterar o papel de um perfil.';
  end if;

  select role into v_role_antigo from perfis where id = p_perfil_id;
  if v_role_antigo is null then
    raise exception 'Perfil não encontrado.';
  end if;
  if p_novo_role not in ('admin', 'superadmin') then
    raise exception 'Papel inválido para esta ação — use alterar_papel só entre admin e superadmin.';
  end if;

  insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
  values ('perfil.alterar_papel', 'perfis', p_perfil_id,
          jsonb_build_object('role_antigo', v_role_antigo, 'role_novo', p_novo_role), auth.uid());

  update perfis set role = p_novo_role where id = p_perfil_id;
end;
$$;

grant execute on function alterar_papel(uuid, text) to authenticated;

-- Por que a validação de `p_novo_role` aqui é mais estreita que o
-- `check` da coluna (que também aceita 'vendedor'): `alterar_papel` é a
-- ação da tela de administradores — trocar alguém para 'vendedor' por
-- ali não faz sentido (vendedor ganha o papel só pelo vínculo por
-- celular, nunca por promoção manual). Vira um erro amigável em vez de
-- deixar a UI esconder essa opção sozinha.


-- ============================================================================
-- 11. Código de vínculo — gerar novo / desvincular
-- ============================================================================

create or replace function regenerar_codigo_vinculo(p_vendedor_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_codigo text;
begin
  if not is_admin() then
    raise exception 'Só administradores podem gerar um código de vínculo.';
  end if;

  v_codigo := fn_gerar_codigo_vinculo();
  update vendedores set codigo_vinculo = v_codigo where id = p_vendedor_id;

  if not found then
    raise exception 'Vendedor não encontrado.';
  end if;

  insert into eventos_auditoria (acao, entidade, entidade_id, realizado_por)
  values ('vendedor.gerar_codigo', 'vendedores', p_vendedor_id, auth.uid());

  return v_codigo;
end;
$$;

create or replace function desvincular_vendedor(p_vendedor_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not is_admin() then
    raise exception 'Só administradores podem desvincular uma conta.';
  end if;

  select user_id into v_user_id from vendedores where id = p_vendedor_id;
  if v_user_id is null then
    raise exception 'Este vendedor ainda não tem conta vinculada.';
  end if;

  insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
  values ('vendedor.desvincular', 'vendedores', p_vendedor_id,
          jsonb_build_object('user_id_removido', v_user_id), auth.uid());

  delete from perfis where id = v_user_id;

  update vendedores
    set user_id = null, email = null, codigo_vinculo = fn_gerar_codigo_vinculo()
    where id = p_vendedor_id;
end;
$$;

grant execute on function regenerar_codigo_vinculo(uuid) to authenticated;
grant execute on function desvincular_vendedor(uuid) to authenticated;


-- ============================================================================
-- 12. Administradores — remover acesso / cancelar convite
--     (upgrade de Server Action solta para função, pelo mesmo motivo de
--     tudo acima: a auditoria deixa de depender do código do front-end
--     lembrar de gravar.)
-- ============================================================================

create or replace function remover_acesso(p_perfil_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Só administradores podem remover acesso.';
  end if;
  if p_perfil_id = auth.uid() then
    raise exception 'Você não pode remover o próprio acesso.';
  end if;

  insert into eventos_auditoria (acao, entidade, entidade_id, realizado_por)
  values ('perfil.remover', 'perfis', p_perfil_id, auth.uid());

  delete from perfis where id = p_perfil_id;
end;
$$;

create or replace function cancelar_convite(p_convite_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_aceito timestamptz;
begin
  if not is_admin() then
    raise exception 'Só administradores podem cancelar convites.';
  end if;

  select aceito_em into v_aceito from convites where id = p_convite_id;
  if not found then
    raise exception 'Convite não encontrado.';
  end if;
  if v_aceito is not null then
    raise exception 'Este convite já foi aceito — não é mais possível cancelar.';
  end if;

  insert into eventos_auditoria (acao, entidade, entidade_id, realizado_por)
  values ('convite.cancelar', 'convites', p_convite_id, auth.uid());

  delete from convites where id = p_convite_id;
end;
$$;

grant execute on function remover_acesso(uuid) to authenticated;
grant execute on function cancelar_convite(uuid) to authenticated;


-- ============================================================================
-- 13. SOLICITACOES_BAIXA — o terceiro degrau: reserva → solicitação → baixa
-- ============================================================================

-- `baixas_cartelas.forma_confirmacao` ganha 'transferencia' como valor
-- válido — antes só existia para a coordenação registrar diretamente
-- (dinheiro/confirmação/ambos); agora uma baixa também pode nascer de
-- uma solicitação de transferência aprovada, e o relatório deve mostrar
-- isso do jeito que realmente aconteceu, não forçado em outra categoria.
alter table baixas_cartelas drop constraint if exists baixas_cartelas_forma_confirmacao_check;
alter table baixas_cartelas add constraint baixas_cartelas_forma_confirmacao_check
  check (forma_confirmacao in ('dinheiro', 'confirmacao_vendedor', 'ambos', 'transferencia'));

create table if not exists solicitacoes_baixa (
  id                uuid primary key default gen_random_uuid(),
  lote_id           uuid not null references lotes_cartelas(id),
  numero_inicial    int not null,
  numero_final      int not null check (numero_final >= numero_inicial),
  quantidade        int generated always as (numero_final - numero_inicial + 1) stored,
  forma_alegada     text not null check (forma_alegada in ('dinheiro', 'transferencia')),
  observacao        text,
  comprovante_path  text,
  status            text not null default 'pendente' check (status in ('pendente', 'aprovada', 'rejeitada')),
  motivo_rejeicao   text,
  solicitado_por    uuid not null references auth.users(id),
  solicitado_em     timestamptz not null default now(),
  analisado_por     uuid references auth.users(id),
  analisado_em      timestamptz
);

create index if not exists idx_solicitacoes_lote on solicitacoes_baixa (lote_id);
create index if not exists idx_solicitacoes_status on solicitacoes_baixa (status);

-- mesma disciplina já usada em `baixas_cartelas` (fn_valida_baixa_dentro_do_lote,
-- schema-v1.sql): a solicitação não pode extrapolar o que foi reservado,
-- verificado no banco, não só na tela do vendedor.
create or replace function fn_valida_solicitacao_dentro_do_lote()
returns trigger language plpgsql as $$
declare
  v_lote lotes_cartelas%rowtype;
begin
  select * into v_lote from lotes_cartelas where id = new.lote_id;
  if v_lote.id is null then
    raise exception 'Lote não encontrado.';
  end if;
  if new.numero_inicial < v_lote.numero_inicial or new.numero_final > v_lote.numero_final then
    raise exception 'Solicitação fora do intervalo reservado (lote %–%).', v_lote.numero_inicial, v_lote.numero_final;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_valida_solicitacao on solicitacoes_baixa;
create trigger trg_valida_solicitacao
  before insert on solicitacoes_baixa
  for each row execute function fn_valida_solicitacao_dentro_do_lote();


-- ============================================================================
-- 14. Aprovar / rejeitar solicitação
--     `aprovar_solicitacao` reaproveita exatamente a validação que já
--     existe para `createBaixa` (dentro do intervalo do lote, sem
--     sobrepor baixa já confirmada) — não é lógica nova, é a mesma regra
--     movida para dentro de uma função, para poder ser chamada tanto por
--     lançamento direto do admin quanto por aprovação de solicitação.
-- ============================================================================

create or replace function aprovar_solicitacao(p_solicitacao_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_sol solicitacoes_baixa%rowtype;
  v_lote lotes_cartelas%rowtype;
  v_conflito record;
  v_baixa_id uuid;
begin
  if not is_admin() then
    raise exception 'Só administradores podem aprovar solicitações.';
  end if;

  select * into v_sol from solicitacoes_baixa where id = p_solicitacao_id;
  if v_sol.id is null then
    raise exception 'Solicitação não encontrada.';
  end if;
  if v_sol.status <> 'pendente' then
    raise exception 'Esta solicitação já foi analisada.';
  end if;

  select * into v_lote from lotes_cartelas where id = v_sol.lote_id;

  if v_sol.numero_inicial < v_lote.numero_inicial or v_sol.numero_final > v_lote.numero_final then
    raise exception 'Solicitação fora do intervalo reservado (%–%).', v_lote.numero_inicial, v_lote.numero_final;
  end if;

  select numero_inicial, numero_final into v_conflito
  from baixas_cartelas
  where lote_id = v_sol.lote_id
    and numero_inicial <= v_sol.numero_final
    and numero_final >= v_sol.numero_inicial
  limit 1;

  if v_conflito.numero_inicial is not null then
    raise exception 'As cartelas %–% já foram confirmadas neste lote.', v_conflito.numero_inicial, v_conflito.numero_final;
  end if;

  insert into baixas_cartelas (lote_id, numero_inicial, numero_final, forma_confirmacao, observacao, registrado_por)
  values (v_sol.lote_id, v_sol.numero_inicial, v_sol.numero_final, v_sol.forma_alegada, v_sol.observacao, auth.uid())
  returning id into v_baixa_id;

  update solicitacoes_baixa
    set status = 'aprovada', analisado_por = auth.uid(), analisado_em = now()
    where id = p_solicitacao_id;

  return v_baixa_id;
end;
$$;

create or replace function rejeitar_solicitacao(p_solicitacao_id uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Só administradores podem rejeitar solicitações.';
  end if;
  if p_motivo is null or btrim(p_motivo) = '' then
    raise exception 'Informe o motivo da rejeição.';
  end if;

  update solicitacoes_baixa
    set status = 'rejeitada', motivo_rejeicao = p_motivo, analisado_por = auth.uid(), analisado_em = now()
    where id = p_solicitacao_id and status = 'pendente';

  if not found then
    raise exception 'Solicitação não encontrada ou já analisada.';
  end if;
end;
$$;

grant execute on function aprovar_solicitacao(uuid) to authenticated;
grant execute on function rejeitar_solicitacao(uuid, text) to authenticated;

-- Nem aprovar nem rejeitar gravam em `eventos_auditoria`: diferente de
-- alterar_papel/desvincular_vendedor (que mexem no ACESSO de alguém),
-- aqui a própria linha de `solicitacoes_baixa` já carrega
-- `analisado_por`/`analisado_em` — o princípio de auditoria (ver
-- 14-roadmap-implementacoes-novas.md) só exige a tabela extra quando não
-- sobra uma linha própria para responder "quem fez, quando".


-- ============================================================================
-- 15. STORAGE — comprovantes de pagamento (bucket privado)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;

-- As políticas abaixo usam `owner` (uuid), a coluna clássica de dono do
-- objeto em `storage.objects`. Supabase vem migrando para `owner_id`
-- (text) em projetos mais novos, mantendo `owner` por compatibilidade —
-- confira em Storage > Policies no Dashboard qual coluna seu projeto
-- está populando de fato antes de rodar esta seção; se for `owner_id`,
-- troque `owner = auth.uid()` por `owner_id = auth.uid()::text` nas
-- duas políticas abaixo.
drop policy if exists "vendedor envia seu proprio comprovante" on storage.objects;
create policy "vendedor envia seu proprio comprovante" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes' and owner = auth.uid());

drop policy if exists "dono e admin leem o comprovante" on storage.objects;
create policy "dono e admin leem o comprovante" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and (owner = auth.uid() or is_admin()));

-- O caminho de cada arquivo segue o padrão
-- `comprovantes/{auth.uid()}/{uuid-do-arquivo}.{ext}` — convenção do
-- client, não uma regra imposta pelo Storage; a política de `insert`
-- acima já é o que realmente impede alguém de gravar em nome de outro
-- `owner`. A leitura sempre passa por *signed URL* de curta duração
-- (nunca link público direto).


-- ============================================================================
-- 16. RLS — vendedor lê só o que é seu (aditivo às policies de admin já
--     existentes desde schema-v2-rls-policies.sql — nenhuma delas muda)
-- ============================================================================

drop policy if exists "vendedor le o proprio cadastro" on vendedores;
create policy "vendedor le o proprio cadastro" on vendedores
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "vendedor le os proprios lotes" on lotes_cartelas;
create policy "vendedor le os proprios lotes" on lotes_cartelas
  for select to authenticated
  using (vendedor_id in (select id from vendedores where user_id = auth.uid()));

drop policy if exists "vendedor le as proprias baixas" on baixas_cartelas;
create policy "vendedor le as proprias baixas" on baixas_cartelas
  for select to authenticated
  using (lote_id in (
    select l.id from lotes_cartelas l
    join vendedores v on v.id = l.vendedor_id
    where v.user_id = auth.uid()
  ));

alter table solicitacoes_baixa enable row level security;

drop policy if exists "vendedor le as proprias solicitacoes" on solicitacoes_baixa;
create policy "vendedor le as proprias solicitacoes" on solicitacoes_baixa
  for select to authenticated
  using (solicitado_por = auth.uid() or is_admin());

drop policy if exists "vendedor insere solicitacao no proprio lote" on solicitacoes_baixa;
create policy "vendedor insere solicitacao no proprio lote" on solicitacoes_baixa
  for insert to authenticated
  with check (
    solicitado_por = auth.uid()
    and lote_id in (
      select l.id from lotes_cartelas l
      join vendedores v on v.id = l.vendedor_id
      where v.user_id = auth.uid()
    )
  );

-- Sem policy de `update`/`delete` para `authenticated` em
-- solicitacoes_baixa: aprovar/rejeitar só acontece via
-- `aprovar_solicitacao`/`rejeitar_solicitacao` (security definer,
-- acima) — o vendedor nunca edita a própria solicitação depois de
-- enviada, nem o admin edita direto pela tabela.

drop policy if exists "admin le todos os perfis" on perfis;
create policy "admin le todos os perfis" on perfis
  for select to authenticated using (is_admin());

drop policy if exists "usuario edita o proprio perfil" on perfis;
create policy "usuario edita o proprio perfil" on perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- (a policy "usuario le o proprio perfil", de schema-v2, continua
-- valendo; a de cima só adiciona a leitura ampla do admin)


-- ============================================================================
-- 17. VIEWS — só as que realmente evitam código repetido no front-end.
--     Igual a vw_ranking_vendedores/vw_resumo_sorteio (schema-v1): a view
--     roda com os privilégios de quem a criou, então o filtro de acesso
--     tem que estar DENTRO da própria view (`is_admin() or ...`), não só
--     na RLS da tabela base.
-- ============================================================================

create or replace view vw_lote_progresso as
select
  l.id as lote_id,
  l.sorteio_id,
  l.vendedor_id,
  l.numero_inicial,
  l.numero_final,
  l.quantidade,
  l.tipo,
  coalesce((select sum(b.quantidade) from baixas_cartelas b where b.lote_id = l.id), 0) as confirmado,
  l.quantidade - coalesce((select sum(b.quantidade) from baixas_cartelas b where b.lote_id = l.id), 0) as pendente,
  coalesce((
    select sum(s.quantidade) from solicitacoes_baixa s
    where s.lote_id = l.id and s.status = 'pendente'
  ), 0) as solicitado_pendente
from lotes_cartelas l
where l.status = 'ativo'
  and (
    is_admin()
    or l.vendedor_id in (select id from vendedores where user_id = auth.uid())
  );

create or replace view vw_solicitacoes_pendentes_admin as
select
  s.id,
  s.lote_id,
  l.sorteio_id,
  v.id as vendedor_id,
  v.nome as vendedor_nome,
  s.numero_inicial,
  s.numero_final,
  s.quantidade,
  s.forma_alegada,
  s.observacao,
  s.comprovante_path,
  s.solicitado_em
from solicitacoes_baixa s
join lotes_cartelas l on l.id = s.lote_id
join vendedores v on v.id = l.vendedor_id
where s.status = 'pendente'
  and is_admin()
order by s.solicitado_em;

grant select on vw_lote_progresso to authenticated;
grant select on vw_solicitacoes_pendentes_admin to authenticated;


-- ============================================================================
-- 18. SEED — o primeiro superusuário
-- ============================================================================

insert into convites (email, nome, role)
values ('rodrigo.dionizio@gmail.com', 'Rodrigo Dionizio', 'superadmin')
on conflict (email) do nothing;

-- Na primeira vez que essa conta logar (Google ou e-mail/senha), o
-- `handle_new_user()` acima encontra este convite e já cria o `perfis`
-- como 'superadmin' sozinho — nenhum passo manual depois disso.


-- ============================================================================
-- Depois de rodar esta migration:
--
-- 1. Confira que `rodrigo.dionizio@gmail.com` ainda não tem conta no
--    Supabase Auth (Authentication > Users) — se já tiver, o convite
--    acima não vai casar automaticamente porque o trigger só roda no
--    INSERT de uma conta nova; nesse caso, rode manualmente:
--
--      update perfis set role = 'superadmin' where email = 'rodrigo.dionizio@gmail.com';
--
-- 2. Ative o provider Google em Authentication > Providers, se ainda
--    não estiver ativo (A.4 em 14-roadmap-implementacoes-novas.md).
--
-- 3. Atualize `src/lib/types/database.ts` com as tabelas/colunas novas
--    (convites, solicitacoes_baixa, eventos_auditoria, e as colunas
--    novas de perfis/vendedores/baixas_cartelas) antes de escrever
--    qualquer tela nova — o TypeScript vai acusar exatamente o que
--    ainda falta no client.
-- ============================================================================
