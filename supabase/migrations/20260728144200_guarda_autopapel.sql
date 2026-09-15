-- >>> MIGRATION VERSIONADA -------------------------------------------------
-- >>> Origem: documentacao/sql/schema-v6-guarda-autopapel.sql (aplicada em produção em 28/07/2026).
-- >>> O corpo abaixo está PRESERVADO COMO FOI APLICADO — não reescreva para
-- >>> "melhorar". Correção de schema se faz em migration nova.
-- >>> Procedimento e histórico: supabase/README.md
-- ---------------------------------------------------------------------------

-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 6: `alterar_papel` (schema-v3) checava `is_superadmin()`, mas não
-- impedia a pessoa de alterar o PRÓPRIO papel — um superadmin poderia se
-- rebaixar a admin sem querer (ou por engano de clique). Se ele for o único
-- superadmin, ninguém mais sobra com permissão de promover alguém de volta —
-- risco real de lockout, no mesmo espírito do que já protege `remover_acesso`
-- (que já bloqueia "remover o próprio acesso").
--
-- Pré-requisito: schema-v3-usuarios-perfis-vendedores.sql já aplicado.
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

  if p_perfil_id = auth.uid() then
    raise exception 'Você não pode alterar o próprio papel — peça a outro superusuário.';
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
