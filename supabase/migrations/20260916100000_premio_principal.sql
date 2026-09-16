-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 16: prêmio principal do sorteio.
--
-- REGRAS DEFINIDAS PELA COORDENAÇÃO (16/09/2026)
--   R1. Todo sorteio tem UM prêmio principal. O banco recusa criar sorteio
--       sem ele. Sorteio com um único prêmio: esse prêmio é o principal,
--       automaticamente.
--   R2. O prêmio "quem vendeu a cartela premiada" vai SEMPRE para o vendedor
--       da cartela sorteada NO PRÊMIO PRINCIPAL. Os vendedores das demais
--       cartelas sorteadas continuam aparecendo, mas não levam esse prêmio.
--   R3. Trocar o principal: primeiro rebaixa o atual, depois promove o novo,
--       com alerta de riscos na tela. Feito só pela tela Sorteios.
--   R4. Depois que o sorteio tem prêmio apurado, a premiação não muda
--       mais — nem o principal, nem nenhum prêmio.
--   R5. Sorteio ENCERRADO não pode ser alterado em nada — nem corrigir
--       número apurado, nem reservas, baixas, compradores, cartelas ou os
--       dados do sorteio — e não pode ser reaberto, "por segurança dos
--       compradores e para fins de auditoria". Enquanto está em andamento,
--       o número apurado ainda pode ser corrigido.
--       EXCEÇÃO definida pela coordenação: o painel da diretoria continua
--       acessível (é só visualização, "documentação ativa do sorteio"), e o
--       código de acesso a ele continua gerenciável.
--
-- COMO R1 E R3 CONVIVEM
--   Se "rebaixar" fosse gravado sozinho, o sorteio ficaria sem principal
--   entre um passo e outro — exatamente o que R1 proíbe. Por isso a tela
--   conduz os dois passos, com os alertas, e o banco grava os dois JUNTOS,
--   numa única transação (`fn_definir_premio_principal`). O sorteio nunca
--   existe sem principal, nem por um instante.
--
-- ONDE CADA REGRA É GARANTIDA — tudo no banco, nada só na tela
--   R1 · índice único parcial (um principal por sorteio)
--       · check (principal só em cartela sorteada)
--       · constraint trigger ADIADA para o commit (sorteio sem principal
--         não é gravado) — em `sorteios` e em `premios_sorteio`
--       · trigger de inserção (primeiro prêmio vira principal)
--       · `fn_criar_sorteio`: sorteio e principal nascem na mesma transação
--   R2 · `resultados_sorteio.premio_id`: a apuração registra PARA QUAL
--         PRÊMIO o número foi sorteado — não mais "1º", "2º"
--       · `vw_premiados_publico` resolve cada vencedor em SQL; o site só lê
--   R3 · trigger recusa mudar `principal` fora de `fn_definir_premio_principal`
--       · trigger recusa remover o prêmio principal
--   R4 · trigger congela `premios_sorteio` do sorteio que tem resultado
--   R5 · trigger em cada tabela com dado do sorteio recusa escrita quando
--         ele está encerrado — inclusive reabrir e apagar o sorteio
--
-- ⚠️ PRÉ-REQUISITOS
--   · supabase/scripts/dados-2026-09-16-remover-sorteio-teste.sql já
--     rodado com COMMIT (feito em 16/09/2026).
--   · Todas as migrations anteriores aplicadas.
--
-- ⚠️ O SORTEIO DE 2026 — APURAÇÃO REAL DE 13/09/2026 (seção 2-A)
--   Ele já está ENCERRADO, com dois resultados gravados pela função antiga
--   ("1º prêmio", "2º prêmio", sem ligação com a premiação). Depois desta
--   migration, sorteio encerrado não muda mais nada (R5) — então a ligação
--   e o prêmio principal precisam ser gravados AQUI, antes das travas.
--   Tudo conforme informado pela coordenação em 16/09/2026:
--     · 1º prêmio, cartela 58    -> "R$ 2.000 em dinheiro"
--     · 2º prêmio, cartela 1781  -> "Uma moto Honda Bros 160 0km"
--     · prêmio principal         -> a moto
--   A seção CONFERE os números antes de gravar. Se o banco não estiver
--   exatamente assim, a migration inteira é recusada e nada muda.
--
-- ⚠️ DEPOIS DE RODAR
--   Outros sorteios que já existiam ficam SEM prêmio principal (a migration
--   não escolhe por ninguém). Até ele ser definido na tela Sorteios, o banco
--   recusa alterar os prêmios desse sorteio e recusa apurá-lo — com mensagem
--   dizendo o que fazer. A consulta do fim lista quais são.
--
-- ⚠️ ORDEM COM O DEPLOY
--   1. esta migration   2. deploy do app
--   Entre os dois, o app antigo não consegue criar sorteio nem apurar
--   (a função antiga de apuração deixa de existir). Nenhum dos dois é
--   feito fora da noite do sorteio.
-- ============================================================================


-- ============================================================================
-- 0. PRÉ-CONDIÇÃO
-- ============================================================================

do $$
begin
  if exists (select 1 from sorteios where nome = 'Sorteio Teste') then
    raise exception 'O Sorteio Teste ainda existe. Rode antes supabase/scripts/dados-2026-09-16-remover-sorteio-teste.sql (com COMMIT).';
  end if;
end $$;


-- ============================================================================
-- 1. O PRÊMIO PRINCIPAL
-- ============================================================================

alter table premios_sorteio
  add column if not exists principal boolean not null default false;

-- O principal é um prêmio de cartela sorteada: é ele que tem número apurado,
-- e é desse número que sai o vendedor de R2.
do $$ begin
  alter table premios_sorteio add constraint premio_principal_e_de_cartela
    check (not principal or categoria = 'cartela_sorteada');
exception when duplicate_object then null; end $$;

create unique index if not exists premios_um_principal_por_sorteio
  on premios_sorteio (sorteio_id) where principal;

comment on column premios_sorteio.principal is
  'O prêmio principal do sorteio (R1). Exatamente um por sorteio, sempre de '
  'cartela sorteada. O vendedor da cartela sorteada NESTE prêmio é quem leva '
  'o prêmio "vendedor_cartela_premiada" (R2). Só muda por fn_definir_premio_principal.';


-- ============================================================================
-- 2. O RESULTADO PASSA A SABER DE QUAL PRÊMIO É
--
--    Antes: "1º prêmio", "2º prêmio" — `ordem`, sem ligação com a premiação.
--    Saber qual número era o do principal dependeria da posição do prêmio
--    na lista, e mexer nas setas mudaria o vencedor. Agora é explícito.
--
--    `ordem` continua existindo (a unique e o check de 1 a 10 seguem
--    valendo), mas vira detalhe interno: é preenchida pela função.
-- ============================================================================

alter table resultados_sorteio
  add column if not exists premio_id uuid
  references premios_sorteio(id) on delete restrict;

do $$ begin
  alter table resultados_sorteio add constraint resultados_um_por_premio unique (premio_id);
exception when duplicate_object then null; end $$;


-- ============================================================================
-- 2-A. A APURAÇÃO REAL DE 2026 — vínculo e prêmio principal
--
--      Informado pela coordenação em 16/09/2026. NÃO é dedução: os números
--      e os prêmios estão escritos aqui e são CONFERIDOS antes de gravar.
--      Qualquer divergência recusa a migration inteira.
--
--      Em banco sem resultado nenhum (um `db reset` local), a seção não faz
--      nada.
-- ============================================================================

do $$
declare
  v_sorteio   uuid;
  v_dinheiro  uuid;
  v_moto      uuid;
  v_qtd       int;
begin
  if not exists (select 1 from resultados_sorteio) then
    return;
  end if;

  select id into v_sorteio
    from sorteios where nome = 'Show de Prêmios da Bom Jesus 2026';
  if v_sorteio is null then
    raise exception 'Há resultados no banco, mas o sorteio "Show de Prêmios da Bom Jesus 2026" não foi encontrado. Nada foi alterado.';
  end if;

  if exists (select 1 from resultados_sorteio where sorteio_id <> v_sorteio) then
    raise exception 'Há resultados de outro sorteio além do de 2026, sem vínculo informado pela coordenação. Nada foi alterado.';
  end if;

  select count(*) into v_qtd from resultados_sorteio where sorteio_id = v_sorteio;
  if v_qtd <> 2
     or not exists (select 1 from resultados_sorteio
                     where sorteio_id = v_sorteio and ordem = 1 and numero_sorteado = 58)
     or not exists (select 1 from resultados_sorteio
                     where sorteio_id = v_sorteio and ordem = 2 and numero_sorteado = 1781) then
    raise exception 'Os resultados de 2026 no banco não são os informados (1º prêmio = cartela 58; 2º prêmio = cartela 1781). Nada foi alterado.';
  end if;

  -- Os prêmios, pelo que a coordenação cadastrou. Exatamente um de cada.
  select count(*) into v_qtd from premios_sorteio
   where sorteio_id = v_sorteio and categoria = 'cartela_sorteada' and titulo ilike '%2.000%';
  if v_qtd <> 1 then
    raise exception 'Esperado exatamente 1 prêmio de cartela sorteada com "2.000" no título em 2026; há %. Nada foi alterado.', v_qtd;
  end if;
  select count(*) into v_qtd from premios_sorteio
   where sorteio_id = v_sorteio and categoria = 'cartela_sorteada' and titulo ilike '%moto%';
  if v_qtd <> 1 then
    raise exception 'Esperado exatamente 1 prêmio de cartela sorteada com "moto" no título em 2026; há %. Nada foi alterado.', v_qtd;
  end if;

  select id into v_dinheiro from premios_sorteio
   where sorteio_id = v_sorteio and categoria = 'cartela_sorteada' and titulo ilike '%2.000%';
  select id into v_moto from premios_sorteio
   where sorteio_id = v_sorteio and categoria = 'cartela_sorteada' and titulo ilike '%moto%';

  update resultados_sorteio set premio_id = v_dinheiro
   where sorteio_id = v_sorteio and ordem = 1;   -- cartela 58
  update resultados_sorteio set premio_id = v_moto
   where sorteio_id = v_sorteio and ordem = 2;   -- cartela 1781
  update premios_sorteio set principal = true where id = v_moto;

  insert into eventos_auditoria (acao, entidade, entidade_id, detalhes)
  values ('migracao.premio_principal', 'sorteios', v_sorteio,
          jsonb_build_object(
            'origem',       'migration 16, informado pela coordenação em 16/09/2026',
            'cartela_58',   'R$ 2.000 em dinheiro',
            'cartela_1781', 'Uma moto Honda Bros 160 0km',
            'principal',    'Uma moto Honda Bros 160 0km'));

  raise notice '2026: cartela 58 -> R$ 2.000; cartela 1781 -> moto (principal).';
end $$;

-- Só agora, com todo resultado vinculado, o vínculo passa a ser obrigatório.
alter table resultados_sorteio alter column premio_id set not null;


-- ============================================================================
-- 3. APURADO?
-- ============================================================================

create or replace function fn_sorteio_apurado(p_sorteio_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from resultados_sorteio where sorteio_id = p_sorteio_id);
$$;

revoke execute on function fn_sorteio_apurado(uuid) from public, anon;
grant execute on function fn_sorteio_apurado(uuid) to authenticated;

create or replace function fn_sorteio_encerrado(p_sorteio_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from sorteios where id = p_sorteio_id and status = 'encerrado');
$$;

revoke execute on function fn_sorteio_encerrado(uuid) from public, anon;
grant execute on function fn_sorteio_encerrado(uuid) to authenticated;


-- ============================================================================
-- 4. GUARDA DOS PRÊMIOS — R1 (primeiro vira principal), R3, R4
--
--    `security definer` para que a checagem de "apurado" nunca seja cegada
--    pela RLS de quem chama. Não devolve dado nenhum.
-- ============================================================================

create or replace function fn_premios_guarda()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sorteio uuid;
begin
  -- `old` e `new` nunca na mesma expressão: em INSERT não há `old`, em
  -- DELETE não há `new`. Resolve-se o sorteio primeiro, por operação.
  if tg_op = 'DELETE' then
    v_sorteio := old.sorteio_id;
    -- Remoção do sorteio inteiro (on delete cascade): o sorteio já não
    -- existe, não há regra de premiação a proteger.
    if not exists (select 1 from sorteios where id = v_sorteio) then
      return old;
    end if;
  else
    v_sorteio := new.sorteio_id;
  end if;

  -- R4
  if fn_sorteio_apurado(v_sorteio) then
    raise exception 'Este sorteio já tem resultado apurado: a premiação não pode mais ser alterada.';
  end if;

  if tg_op = 'INSERT' then
    if not exists (select 1 from premios_sorteio where sorteio_id = new.sorteio_id) then
      -- R1: o único prêmio do sorteio é, automaticamente, o principal.
      if new.categoria <> 'cartela_sorteada' then
        raise exception 'O primeiro prêmio de um sorteio é o prêmio principal e precisa ser de cartela sorteada.';
      end if;
      new.principal := true;
    elsif new.principal then
      raise exception 'Este sorteio já tem prêmio principal. Para trocar, use "Trocar prêmio principal" na tela Sorteios.';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.sorteio_id <> old.sorteio_id then
      raise exception 'Um prêmio não pode ser movido para outro sorteio.';
    end if;
    -- R3: só pela função, que registra auditoria e faz os dois passos juntos.
    if new.principal is distinct from old.principal
       and coalesce(current_setting('app.troca_premio_principal', true), '') <> 'on' then
      raise exception 'O prêmio principal só pode ser alterado pela tela Sorteios ("Trocar prêmio principal").';
    end if;
    if new.principal and new.categoria <> 'cartela_sorteada' then
      raise exception 'Este é o prêmio principal e precisa continuar sendo de cartela sorteada. Troque o prêmio principal antes de mudar a categoria dele.';
    end if;
    return new;
  end if;

  -- DELETE — R3
  if old.principal then
    raise exception 'Este é o prêmio principal do sorteio e não pode ser removido. Promova outro prêmio a principal antes, na tela Sorteios.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_premios_guarda on premios_sorteio;
create trigger trg_premios_guarda
  before insert or update or delete on premios_sorteio
  for each row execute function fn_premios_guarda();


-- ============================================================================
-- 5. INVARIANTE — R1: nenhum sorteio é gravado sem prêmio principal
--
--    Constraint trigger ADIADA: a checagem roda no COMMIT, não linha a linha.
--    É isso que permite criar o sorteio e o prêmio principal em sequência,
--    e trocar o principal em dois passos, sem que o estado intermediário
--    (válido só dentro da transação) seja recusado.
-- ============================================================================

create or replace function fn_premio_principal_invariante()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sorteio uuid;
  v_nome    text;
  v_qtd     int;
begin
  if tg_table_name = 'sorteios' then
    v_sorteio := new.id;
  elsif tg_op = 'DELETE' then
    v_sorteio := old.sorteio_id;
  else
    v_sorteio := new.sorteio_id;
  end if;

  select nome into v_nome from sorteios where id = v_sorteio;
  if not found then
    return null; -- sorteio removido na mesma transação
  end if;

  select count(*) into v_qtd
    from premios_sorteio where sorteio_id = v_sorteio and principal;

  if v_qtd <> 1 then
    raise exception 'O sorteio "%" precisa ter um prêmio principal definido. Defina-o na tela Sorteios.', v_nome;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_premio_principal_invariante on premios_sorteio;
create constraint trigger trg_premio_principal_invariante
  after insert or update or delete on premios_sorteio
  deferrable initially deferred
  for each row execute function fn_premio_principal_invariante();

drop trigger if exists trg_sorteio_exige_premio_principal on sorteios;
create constraint trigger trg_sorteio_exige_premio_principal
  after insert on sorteios
  deferrable initially deferred
  for each row execute function fn_premio_principal_invariante();


-- ============================================================================
-- 6. CRIAR SORTEIO — R1: o sorteio já nasce com o prêmio principal
--
--    Um `insert into sorteios` direto continua possível para o admin, mas é
--    recusado no commit (seção 5). Este é o caminho que a tela usa.
-- ============================================================================

create or replace function fn_criar_sorteio(
  p_nome              text,
  p_descricao         text,
  p_cartela_min       int,
  p_cartela_max       int,
  p_preco_cartela     numeric,
  p_data_sorteio      date,
  p_premio_titulo     text,
  p_premio_descricao  text,
  p_premio_valor      numeric
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not is_admin() then
    raise exception 'Apenas a equipe administrativa pode criar sorteios.';
  end if;
  if coalesce(length(trim(p_premio_titulo)), 0) = 0 then
    raise exception 'Todo sorteio precisa de um prêmio principal. Informe qual é.';
  end if;

  insert into sorteios (nome, descricao, cartela_min, cartela_max, preco_cartela, data_sorteio)
  values (trim(p_nome), nullif(trim(p_descricao), ''), p_cartela_min, p_cartela_max,
          p_preco_cartela, p_data_sorteio)
  returning id into v_id;

  insert into premios_sorteio
    (sorteio_id, ordem, categoria, titulo, descricao, valor, quantidade,
     exibir_publico, principal, criado_por)
  values
    (v_id, 1, 'cartela_sorteada', trim(p_premio_titulo),
     nullif(trim(p_premio_descricao), ''), p_premio_valor, 1,
     true, true, auth.uid());

  insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
  values ('sorteio.criar', 'sorteios', v_id,
          jsonb_build_object('nome', trim(p_nome), 'premio_principal', trim(p_premio_titulo)),
          auth.uid());

  return v_id;
end;
$$;

revoke execute on function fn_criar_sorteio(text, text, int, int, numeric, date, text, text, numeric)
  from public, anon;
grant execute on function fn_criar_sorteio(text, text, int, int, numeric, date, text, text, numeric)
  to authenticated;


-- ============================================================================
-- 7. DEFINIR / TROCAR O PRÊMIO PRINCIPAL — R3
--
--    Os dois passos que a tela conduz — rebaixar o atual, promover o novo —
--    acontecem aqui, NESTA ORDEM, na mesma transação. O índice único é
--    imediato: promover antes de rebaixar falharia. A invariante (seção 5)
--    só confere no commit, quando os dois já foram feitos.
-- ============================================================================

create or replace function fn_definir_premio_principal(p_premio_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_novo     premios_sorteio%rowtype;
  v_anterior premios_sorteio%rowtype;
begin
  if not is_admin() then
    raise exception 'Apenas a equipe administrativa pode definir o prêmio principal.';
  end if;

  select * into v_novo from premios_sorteio where id = p_premio_id;
  if not found then
    raise exception 'Prêmio não encontrado.';
  end if;
  if v_novo.principal then
    raise exception 'Este prêmio já é o principal do sorteio.';
  end if;
  if v_novo.categoria <> 'cartela_sorteada' then
    raise exception 'Só um prêmio de cartela sorteada pode ser o prêmio principal.';
  end if;
  if fn_sorteio_apurado(v_novo.sorteio_id) then
    raise exception 'Este sorteio já tem resultado apurado: o prêmio principal não pode mais ser trocado.';
  end if;

  select * into v_anterior
    from premios_sorteio where sorteio_id = v_novo.sorteio_id and principal;

  perform set_config('app.troca_premio_principal', 'on', true);

  -- Passo 1: rebaixar
  if v_anterior.id is not null then
    update premios_sorteio set principal = false where id = v_anterior.id;
  end if;
  -- Passo 2: promover
  update premios_sorteio set principal = true where id = p_premio_id;

  perform set_config('app.troca_premio_principal', '', true);

  insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
  values (
    case when v_anterior.id is null then 'premio.principal.definir'
         else 'premio.principal.trocar' end,
    'premios_sorteio', p_premio_id,
    jsonb_build_object(
      'sorteio_id',      v_novo.sorteio_id,
      'anterior_id',     v_anterior.id,
      'anterior_titulo', v_anterior.titulo,
      'novo_titulo',     v_novo.titulo
    ),
    auth.uid()
  );
end;
$$;

revoke execute on function fn_definir_premio_principal(uuid) from public, anon;
grant execute on function fn_definir_premio_principal(uuid) to authenticated;


-- ============================================================================
-- 8. APURAR UM PRÊMIO — substitui fn_registrar_resultado_sorteio
--
--    Recebe o PRÊMIO, não a ordem. Mantém o que já valia:
--    · regra 9: apura mesmo sem venda confirmada (sinaliza, não recusa)
--    · regra 10: apurar de novo o mesmo prêmio corrige o número, com
--      evento `sorteio.reapurar` na auditoria
--    · regra 21: o maior vendedor é resolvido uma única vez, na primeira
--      apuração do sorteio
--
--    Agora `security definer` com `is_admin()` explícito: a escrita direta
--    em `resultados_sorteio` é revogada (seção 9), e esta função passa a
--    ser o ÚNICO caminho para registrar um resultado.
-- ============================================================================

drop function if exists fn_registrar_resultado_sorteio(uuid, int, int);

create or replace function fn_apurar_premio(p_premio_id uuid, p_numero_sorteado int)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_premio     premios_sorteio%rowtype;
  v_ordem      int;
  v_vendedor   uuid;
  v_confirmada boolean;
  v_maior      uuid;
  v_anterior   int;
  v_id         uuid;
begin
  if not is_admin() then
    raise exception 'Apenas a equipe administrativa pode apurar.';
  end if;

  select * into v_premio from premios_sorteio where id = p_premio_id;
  if not found then
    raise exception 'Prêmio não encontrado.';
  end if;
  if v_premio.categoria <> 'cartela_sorteada' then
    raise exception 'Só prêmios de cartela sorteada recebem número apurado. Os prêmios de vendedor são resolvidos pelo sistema.';
  end if;
  -- R5: apurar e corrigir só com o sorteio em andamento, nunca encerrado.
  if fn_sorteio_encerrado(v_premio.sorteio_id) then
    raise exception 'Sorteio encerrado: o resultado não pode mais ser alterado.';
  end if;
  if not exists (select 1 from premios_sorteio where sorteio_id = v_premio.sorteio_id and principal) then
    raise exception 'Defina o prêmio principal do sorteio na tela Sorteios antes de apurar.';
  end if;

  -- Posição do prêmio entre os de cartela, pela ordem da tela. Estável: a
  -- partir da primeira apuração a premiação fica congelada (R4).
  select pos into v_ordem from (
    select id, row_number() over (order by ordem) as pos
      from premios_sorteio
     where sorteio_id = v_premio.sorteio_id and categoria = 'cartela_sorteada'
  ) t where t.id = p_premio_id;

  -- Guardado ANTES do upsert: é o que diferencia apuração de correção.
  select numero_sorteado into v_anterior
    from resultados_sorteio where premio_id = p_premio_id;

  select vendedor_id, confirmada into v_vendedor, v_confirmada
    from fn_localizar_vendedor_por_cartela(v_premio.sorteio_id, p_numero_sorteado);

  -- Regra 21: o maior vendedor sai do ranking na PRIMEIRA apuração do
  -- sorteio (ou na correção dela, se nenhuma outra existir ainda).
  if not exists (select 1 from resultados_sorteio
                  where sorteio_id = v_premio.sorteio_id and premio_id <> p_premio_id) then
    select vendedor_id into v_maior
      from vw_ranking_vendedores
     where sorteio_id = v_premio.sorteio_id and posicao = 1;
  end if;

  insert into resultados_sorteio (
    sorteio_id, premio_id, ordem, numero_sorteado, vendedor_id,
    cartela_confirmada, maior_vendedor_id, sorteado_em, registrado_por
  ) values (
    v_premio.sorteio_id, p_premio_id, v_ordem, p_numero_sorteado, v_vendedor,
    coalesce(v_confirmada, false), v_maior, now(), auth.uid()
  )
  on conflict (premio_id) do update
    set numero_sorteado    = excluded.numero_sorteado,
        vendedor_id        = excluded.vendedor_id,
        cartela_confirmada = excluded.cartela_confirmada,
        -- nunca apaga o maior vendedor já resolvido
        maior_vendedor_id  = coalesce(excluded.maior_vendedor_id, resultados_sorteio.maior_vendedor_id),
        sorteado_em        = excluded.sorteado_em,
        registrado_por     = excluded.registrado_por
  returning id into v_id;

  if v_anterior is not null then
    insert into eventos_auditoria (acao, entidade, entidade_id, detalhes, realizado_por)
    values (
      'sorteio.reapurar', 'resultados_sorteio', v_id,
      jsonb_build_object(
        'sorteio_id',      v_premio.sorteio_id,
        'premio_id',       p_premio_id,
        'premio_titulo',   v_premio.titulo,
        'numero_anterior', v_anterior,
        'numero_novo',     p_numero_sorteado
      ),
      auth.uid()
    );
  end if;

  return v_id;
end;
$$;

revoke execute on function fn_apurar_premio(uuid, int) from public, anon;
grant execute on function fn_apurar_premio(uuid, int) to authenticated;


-- ============================================================================
-- 9. RESULTADO SÓ ENTRA PELA FUNÇÃO
--
--    A policy "admin acessa resultados_sorteio" (for all) segue existindo,
--    mas sem o privilégio de escrita ela só serve para LER. Sem isto,
--    qualquer admin gravaria um resultado direto pela API sem passar por
--    nenhuma das regras acima.
-- ============================================================================

revoke insert, update, delete, truncate on resultados_sorteio from authenticated, anon;


-- ============================================================================
-- 10. VENCEDORES, RESOLVIDOS NO BANCO — R2
--
--     Uma linha por prêmio PÚBLICO. O site não calcula vencedor nenhum:
--       cartela_sorteada           → comprador e vendedor da cartela apurada
--       maior_vendedor             → 1º do ranking, fixado na apuração
--       vendedor_cartela_premiada  → vendedor da cartela do PRÊMIO PRINCIPAL
--
--     A view roda com os privilégios do dono (sem RLS), por isso o filtro
--     `exibir_publico` está AQUI e não pode sair. Mesma disciplina de dados
--     da vw_resultado_publico: nome do comprador sim, contato e telefone não.
-- ============================================================================

create or replace view vw_premiados_publico as
with apuracao as (
  select r.premio_id,
         r.sorteio_id,
         r.numero_sorteado,
         r.cartela_confirmada,
         vp.nome          as vendedor_nome,
         cc.nome_comprador
    from resultados_sorteio r
    left join vendedores vp          on vp.id = r.vendedor_id
    left join compradores_cartela cc on cc.sorteio_id = r.sorteio_id
                                    and cc.numero_cartela = r.numero_sorteado
),
maior as (
  select distinct on (r.sorteio_id)
         r.sorteio_id,
         vm.nome as vendedor_nome
    from resultados_sorteio r
    join vendedores vm on vm.id = r.maior_vendedor_id
   order by r.sorteio_id, r.sorteado_em
),
principal as (
  -- Sem filtro de `exibir_publico`: o prêmio de vendedor pode ser público
  -- mesmo que o principal não seja. Daqui só sai o nome do vendedor.
  select p.sorteio_id,
         a.vendedor_nome,
         a.cartela_confirmada
    from premios_sorteio p
    join apuracao a on a.premio_id = p.id
   where p.principal
)
select
  p.sorteio_id,
  p.id          as premio_id,
  p.ordem,
  p.categoria,
  p.titulo,
  p.descricao,
  p.valor,
  p.quantidade,
  p.principal,
  case p.categoria
    when 'cartela_sorteada'          then a.premio_id  is not null
    when 'maior_vendedor'            then m.sorteio_id is not null
    when 'vendedor_cartela_premiada' then pr.sorteio_id is not null
    else false
  end           as apurado,
  a.numero_sorteado,
  a.nome_comprador,
  case p.categoria
    when 'cartela_sorteada'          then a.vendedor_nome
    when 'maior_vendedor'            then m.vendedor_nome
    when 'vendedor_cartela_premiada' then pr.vendedor_nome
  end           as vendedor_nome,
  case p.categoria
    when 'cartela_sorteada'          then a.cartela_confirmada
    when 'vendedor_cartela_premiada' then pr.cartela_confirmada
  end           as venda_confirmada
from premios_sorteio p
left join apuracao  a  on a.premio_id   = p.id
left join maior     m  on m.sorteio_id  = p.sorteio_id
left join principal pr on pr.sorteio_id = p.sorteio_id
where p.exibir_publico;

revoke all on vw_premiados_publico from anon, authenticated;
grant select on vw_premiados_publico to anon, authenticated;


-- ============================================================================
-- 10-A. SORTEIO ENCERRADO NÃO MUDA MAIS — R5
--
--     Uma trava por tabela que guarda dado do sorteio. Trigger, e não
--     checagem de tela: são várias portas de escrita (reserva, baixa,
--     importação de planilha, solicitação do vendedor e sua aprovação,
--     geração de cartelas, prêmios, apuração), e qualquer uma esquecida
--     viraria a brecha. Com a trava na tabela, não há porta esquecida.
--
--     O nome começa com `trg_encerrado`: triggers do mesmo momento disparam
--     em ordem alfabética, então esta roda antes das outras guardas e a
--     mensagem que chega à tela é a do encerramento.
--
--     FICAM DE FORA, de propósito:
--       · acessos_diretoria — decisão da coordenação: o painel é documentação
--         ativa do sorteio, e o código de acesso continua gerenciável.
--       · eventos_auditoria — a auditoria precisa continuar registrando.
--       · vendedores — são da paróquia, não do sorteio.
-- ============================================================================

create or replace function fn_encerrado_trava()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_antes  uuid;
  v_depois uuid;
begin
  -- O próprio sorteio: encerrado não se edita, não se reabre, não se apaga.
  -- O ato de encerrar (em_andamento -> encerrado) passa, porque o estado
  -- ANTERIOR ainda não era encerrado.
  if tg_table_name = 'sorteios' then
    if old.status = 'encerrado' then
      raise exception 'Sorteio encerrado: nada pode ser alterado, e ele não pode ser reaberto (segurança dos compradores e auditoria).';
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Demais tabelas: o sorteio da linha antes e depois da mudança. `old` e
  -- `new` nunca na mesma expressão (INSERT não tem `old`; DELETE, `new`).
  if tg_op in ('UPDATE', 'DELETE') then
    if tg_table_name in ('baixas_cartelas', 'solicitacoes_baixa') then
      select sorteio_id into v_antes from lotes_cartelas where id = old.lote_id;
    else
      v_antes := old.sorteio_id;
    end if;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    if tg_table_name in ('baixas_cartelas', 'solicitacoes_baixa') then
      select sorteio_id into v_depois from lotes_cartelas where id = new.lote_id;
    else
      v_depois := new.sorteio_id;
    end if;
  end if;

  if fn_sorteio_encerrado(v_antes) or fn_sorteio_encerrado(v_depois) then
    raise exception 'Sorteio encerrado: nada pode ser alterado (segurança dos compradores e auditoria).';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

do $$
declare
  v_tabela text;
begin
  foreach v_tabela in array array[
    'sorteios', 'lotes_cartelas', 'baixas_cartelas', 'solicitacoes_baixa',
    'compradores_cartela', 'cartelas', 'premios_sorteio', 'resultados_sorteio'
  ] loop
    execute format('drop trigger if exists trg_encerrado_trava on %I', v_tabela);
    execute format(
      'create trigger trg_encerrado_trava before %s on %I for each row execute function fn_encerrado_trava()',
      case when v_tabela = 'sorteios' then 'update or delete' else 'insert or update or delete' end,
      v_tabela
    );
  end loop;
end $$;


-- ============================================================================
-- 11. VERIFICAÇÃO
-- ============================================================================

select * from (
  select 1 as ord, 'PP-01' as codigo, 'Coluna premios_sorteio.principal' as item,
         case when exists (select 1 from information_schema.columns
                            where table_name = 'premios_sorteio' and column_name = 'principal')
              then 'OK' else 'FALHA' end as status
  union all
  select 2, 'PP-02', 'Um principal por sorteio (indice unico)',
         case when to_regclass('public.premios_um_principal_por_sorteio') is not null
              then 'OK' else 'FALHA' end
  union all
  select 3, 'PP-03', 'resultados_sorteio.premio_id obrigatorio',
         case when exists (select 1 from information_schema.columns
                            where table_name = 'resultados_sorteio' and column_name = 'premio_id'
                              and is_nullable = 'NO')
              then 'OK' else 'FALHA' end
  union all
  select 4, 'PP-04', 'Triggers de guarda e invariante',
         case when (select count(*) from pg_trigger
                     where tgname in ('trg_premios_guarda',
                                      'trg_premio_principal_invariante',
                                      'trg_sorteio_exige_premio_principal')) = 3
              then 'OK' else 'FALHA' end
  union all
  select 5, 'PP-05', 'Funcao antiga de apuracao removida',
         case when not exists (select 1 from pg_proc where proname = 'fn_registrar_resultado_sorteio')
              then 'OK' else 'FALHA' end
  union all
  select 6, 'PP-06', 'authenticated NAO escreve direto em resultados_sorteio',
         case when not exists (select 1 from information_schema.role_table_grants
                                where table_name = 'resultados_sorteio'
                                  and grantee in ('authenticated', 'anon')
                                  and privilege_type in ('INSERT', 'UPDATE', 'DELETE'))
              then 'OK' else 'FALHA' end
  union all
  select 7, 'PP-07', 'anon NAO executa as funcoes novas',
         case when not exists (select 1 from information_schema.role_routine_grants
                                where routine_name in ('fn_criar_sorteio', 'fn_definir_premio_principal',
                                                       'fn_apurar_premio', 'fn_sorteio_apurado')
                                  and grantee = 'anon')
              then 'OK' else 'FALHA' end
  union all
  select 8, 'PP-08', 'Trava de sorteio encerrado nas 8 tabelas',
         case when (select count(*) from pg_trigger where tgname = 'trg_encerrado_trava') = 8
              then 'OK' else 'FALHA' end
  union all
  select 9, 'PP-09', 'acessos_diretoria SEM trava (painel segue acessivel)',
         case when not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                                where t.tgname = 'trg_encerrado_trava'
                                  and c.relname = 'acessos_diretoria')
              then 'OK' else 'FALHA' end
  union all
  select 200 + row_number() over (order by r.ordem), 'PP-VINCULO',
         s.nome || ': cartela ' || r.numero_sorteado || ' -> ' || p.titulo
           || case when p.principal then ' (PRINCIPAL)' else '' end,
         'OK'
    from resultados_sorteio r
    join premios_sorteio p on p.id = r.premio_id
    join sorteios s        on s.id = r.sorteio_id
  union all
  -- Não é falha da migration: é o que a coordenação precisa fazer em seguida.
  select 100 + row_number() over (order by s.created_at), 'PP-PENDENTE',
         'Sem premio principal: ' || s.nome, 'DEFINIR NA TELA SORTEIOS'
    from sorteios s
   where not exists (select 1 from premios_sorteio p where p.sorteio_id = s.id and p.principal)
) t order by ord;
