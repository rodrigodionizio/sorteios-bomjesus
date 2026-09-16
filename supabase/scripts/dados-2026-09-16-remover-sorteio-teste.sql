-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- DADOS · 16/09/2026 — remove o "Sorteio Teste" e TUDO que é dele.
--
-- AUTORIZAÇÃO: pedido explícito da coordenação em 16/09/2026 — "é apenas
-- um teste e pode ser deletado completamente do banco com todas as
-- informações do sorteio para não acontecer dúvidas".
--
-- POR QUE AGORA: a migration 16 (prêmio principal) exige que todo resultado
-- apurado aponte para um prêmio. O resultado de teste gravado em 29/08 não
-- aponta para nenhum, e a migration se recusa a rodar enquanto ele existir.
--
-- ORDEM: rode ESTE script ANTES da migration 16.
--
-- NÃO É MIGRATION: é uma operação única sobre dado de produção. Um
-- `db reset` local não tem Sorteio Teste nenhum para apagar.
--
-- ⚠️ COMO RODAR — EM DUAS PASSADAS
--   1ª. Rode como está (`v_confirmar := false`). O script apaga tudo DENTRO
--       de um bloco e, no fim, lança um ERRO de propósito: o erro desfaz
--       todas as remoções e a mensagem dele é o relatório do que SERIA
--       apagado. Nada muda no banco.
--   2ª. Conferiu o relatório? Troque para `v_confirmar := true` e rode de
--       novo. O resultado final mostra a prova de que nada sobrou.
--
-- O QUE NÃO É APAGADO (de propósito)
--   · `vendedores` — são da paróquia, não do sorteio; servem a todos.
--   · `eventos_auditoria` — a trilha de ações. Apagá-la para "não deixar
--     dúvida" teria o efeito oposto. Se a coordenação quiser, é à parte.
--   · Arquivos de comprovante no Storage (bucket `comprovantes`). SQL não
--     deve apagar objeto de Storage: os caminhos saem no relatório, e a
--     remoção é pelo painel do Supabase → Storage.
-- ============================================================================

do $$
declare
  -- ▼▼▼ 1ª passada: false (simula). 2ª passada: true (apaga de verdade). ▼▼▼
  v_confirmar  boolean := false;
  -- ▲▲▲

  v_id         uuid;
  v_qtd        int;
  v_lotes      uuid[];
  v_baixas     uuid[];
  v_n          int;
  v_relatorio  text := '';
  v_comprov    text;
begin
  select count(*) into v_qtd from sorteios where nome = 'Sorteio Teste';
  if v_qtd = 0 then
    raise exception 'Nenhum sorteio chamado exatamente "Sorteio Teste". Nada foi removido — confira o nome.';
  elsif v_qtd > 1 then
    raise exception 'Há % sorteios chamados "Sorteio Teste". Nada foi removido — é preciso escolher pelo id.', v_qtd;
  end if;

  select id into v_id from sorteios where nome = 'Sorteio Teste';

  select coalesce(array_agg(id), '{}') into v_lotes
    from lotes_cartelas where sorteio_id = v_id;
  select coalesce(array_agg(id), '{}') into v_baixas
    from baixas_cartelas where lote_id = any(v_lotes);

  select string_agg(sb.comprovante_path, E'\n    ') into v_comprov
    from solicitacoes_baixa sb
   where sb.lote_id = any(v_lotes) and sb.comprovante_path is not null;

  v_relatorio := format(E'Sorteio Teste (%s)\n', v_id);

  -- Dos dependentes para o sorteio. Só `cartelas` e `premios_sorteio` têm
  -- `on delete cascade`; o resto precisa de ordem explícita.
  delete from resultados_sorteio where sorteio_id = v_id;
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  resultados_sorteio ..... %s\n', v_n);

  delete from compradores_cartela where sorteio_id = v_id;
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  compradores_cartela .... %s\n', v_n);

  delete from log_importacao where lote_id = any(v_lotes) or baixa_id = any(v_baixas);
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  log_importacao ......... %s\n', v_n);

  delete from solicitacoes_baixa where lote_id = any(v_lotes);
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  solicitacoes_baixa ..... %s\n', v_n);

  delete from baixas_cartelas where id = any(v_baixas);
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  baixas_cartelas ........ %s\n', v_n);

  delete from lotes_cartelas where id = any(v_lotes);
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  lotes_cartelas ......... %s\n', v_n);

  delete from acessos_diretoria where sorteio_id = v_id;
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  acessos_diretoria ...... %s\n', v_n);

  select count(*) into v_n from cartelas where sorteio_id = v_id;
  v_relatorio := v_relatorio || format(E'  cartelas (cascade) ..... %s\n', v_n);
  select count(*) into v_n from premios_sorteio where sorteio_id = v_id;
  v_relatorio := v_relatorio || format(E'  premios_sorteio (casc.). %s\n', v_n);

  delete from sorteios where id = v_id;
  get diagnostics v_n = row_count;
  v_relatorio := v_relatorio || format(E'  sorteios ............... %s\n', v_n);

  v_relatorio := v_relatorio || E'\nComprovantes para remover à mão no Storage:\n    '
                             || coalesce(v_comprov, '(nenhum)');

  if not v_confirmar then
    -- O erro desfaz tudo o que este bloco fez. É a simulação.
    raise exception E'SIMULAÇÃO — NADA FOI APAGADO.\n\n%\n\nSe estiver certo, troque v_confirmar para true e rode de novo.', v_relatorio;
  end if;

  raise notice E'REMOVIDO.\n%', v_relatorio;
end $$;


-- Só chega aqui na 2ª passada. Prova de que nada do teste sobrou.
select
  (select count(*) from sorteios where nome = 'Sorteio Teste')                                   as sorteios_teste_restantes,
  (select count(*) from resultados_sorteio)                                                      as resultados_no_banco,
  (select count(*) from lotes_cartelas where sorteio_id not in (select id from sorteios))        as lotes_orfaos,
  (select count(*) from compradores_cartela where sorteio_id not in (select id from sorteios))   as compradores_orfaos;
