-- ============================================================================
-- Sistema de Gestão de Sorteios — Paróquia Bom Jesus
-- Migration 15: DADOS — a premiação do sorteio de 2026.
--
-- Não é schema: é o cadastro da premiação que até agora só existia como
-- texto fixo em src/app/page.tsx e no cartaz impresso. Separada da
-- migration 14 de propósito — schema e dado têm ciclos de vida diferentes,
-- e um `db reset` num banco local sem o sorteio de 2026 não pode falhar
-- por causa disto.
--
-- O QUE CADASTRA
--   · 2 × R$ 2.000 em dinheiro  → maior_vendedor
--   · 1 × moto 0km              → vendedor_cartela_premiada
--
-- O QUE NÃO CADASTRA
--   Os prêmios da categoria `cartela_sorteada` (os de quem COMPROU a
--   cartela). O sorteio está com `premios_previstos = 2`, então a tela de
--   prêmios vai avisar que faltam dois — é intencional: o título e a
--   descrição deles precisam vir da coordenação, não de um palpite meu.
--
-- IDEMPOTENTE
--   Roda mais de uma vez sem duplicar (a unique (sorteio_id, ordem) é a
--   trava, e o insert usa `on conflict do nothing`). Se o sorteio não for
--   encontrado, não faz nada e avisa — não falha.
-- ============================================================================

do $$
declare
  v_sorteio_id uuid;
  v_nome       text;
begin
  -- O nome em produção é "Show de Prêmios da Bom Jesus 2026" (conferido no
  -- pré-voo da migration 13). A busca é por padrão, não por igualdade, para
  -- sobreviver a um acento ou espaço a mais.
  select id, nome into v_sorteio_id, v_nome
  from sorteios
  where nome ilike '%bom jesus%2026%'
  order by created_at desc
  limit 1;

  if v_sorteio_id is null then
    raise notice 'Sorteio de 2026 nao encontrado — nada foi cadastrado. '
                 'Cadastre a premiacao pela tela /admin/sorteios.';
    return;
  end if;

  raise notice 'Cadastrando premiacao em: % (%)', v_nome, v_sorteio_id;

  insert into premios_sorteio
    (sorteio_id, ordem, categoria, titulo, descricao, valor, quantidade, exibir_publico)
  values
    (v_sorteio_id, 1, 'maior_vendedor',
     'R$ 2.000 em dinheiro',
     'Para os dois vendedores com maior número de cartelas vendidas.',
     2000.00, 2, true),

    (v_sorteio_id, 2, 'vendedor_cartela_premiada',
     'Uma moto 0km',
     'Para o vendedor que vender a cartela sorteada.',
     null, 1, true)
  on conflict on constraint premios_sorteio_ordem_unica do nothing;
end $$;


-- Conferência.
select p.ordem, p.categoria, p.titulo, p.quantidade, p.valor, s.nome as sorteio
from premios_sorteio p
join sorteios s on s.id = p.sorteio_id
order by s.created_at desc, p.ordem;
