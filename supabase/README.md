# Migrations — Sorteios Bom Jesus

O schema do banco passou a viver **dentro do repositório**, versionado junto
com o código que depende dele. Antes ele morava em `documentacao/sql/`, fora
do Git: não havia como saber, olhando um commit, qual versão de schema ele
pressupunha.

## ⚠️ Leia antes de rodar qualquer coisa

**O banco de produção já tem TODAS estas migrations aplicadas.** Elas foram
executadas à mão no SQL Editor do Supabase entre 22/07/2026 e 29/08/2026.
Os arquivos aqui são o registro do que já aconteceu — **não** uma fila de
coisas a executar.

Rodar `supabase db push` contra produção sem antes marcar o histórico como
aplicado tentaria reexecutar tudo desde o `create table sorteios` e falharia
(na melhor hipótese) ou corromperia estado (na pior). O passo de
`migration repair`, abaixo, é obrigatório e só se faz **uma vez**.

## Procedência dos arquivos

| Migration | Origem | Aplicada em produção |
|---|---|---|
| `20260722094711_schema_base` | `schema-v1.sql` | 22/07/2026 |
| `20260722140617_rls_policies` | `schema-v2-rls-policies.sql` | 22/07/2026 |
| `20260728104552_usuarios_perfis_vendedores` | `schema-v3-usuarios-perfis-vendedores.sql` | 28/07/2026 |
| `20260728141204_pix_forma_pagamento` | `schema-v4-pix.sql` | 28/07/2026 |
| `20260728144123_vendedor_dashboard` | `schema-v5-vendedor-dashboard.sql` | 28/07/2026 |
| `20260728144200_guarda_autopapel` | `schema-v6-guarda-autopapel.sql` | 28/07/2026 |
| `20260728155440_painel_diretoria` | `schema-v7-painel-diretoria.sql` | 28/07/2026 |
| `20260805173541_comprador_cartela` | `schema-v8-comprador-cartela.sql` | 05/08/2026 |
| `20260811151043_reapuracao` | `schema-v9-reapuracao.sql` | 11/08/2026 |
| `20260825140252_correcoes_inspecao` | `schema-v10-correcoes-inspecao.sql` | 25/08/2026 |
| `20260825154058_chave_pix` | `schema-v11-chave-pix.sql` | 25/08/2026 |
| `20260825154505_cartelas_bingo` | `schema-v12-cartelas-bingo.sql` | 25/08/2026 |
| `20260829122829_multiplos_premios` | `schema-v13-multiplos-premios.sql` | 29/08/2026 |

O corpo de cada arquivo é **byte por byte** o que foi aplicado — só ganhou um
cabeçalho de procedência. Isso é deliberado: o valor do histórico está em ele
ser fiel, não em ser bonito. Um erro numa migration antiga se corrige com uma
migration nova, nunca editando a antiga.

Duas observações sobre os carimbos de tempo:

- Eles vêm da data de modificação de cada arquivo original, que coincide com
  a data de aplicação registrada na documentação.
- `20260728144200_guarda_autopapel` (v6) teve o horário ajustado em alguns
  minutos: o arquivo original era mais antigo que o da v5, e o CLI ordena por
  nome. As duas são independentes entre si — a ordem relativa não tem efeito.

Os `schema-v*.sql` continuam em `documentacao/sql/` como estavam. A partir de
agora eles são **histórico morto**: a fonte da verdade é esta pasta.

## Vincular o repositório ao projeto hospedado (uma vez por máquina)

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
```

O `<ref-do-projeto>` é o subdomínio da `NEXT_PUBLIC_SUPABASE_URL`
(`https://<ref>.supabase.co`). O `link` pede a senha do banco.

## Marcar o histórico como já aplicado (uma vez, só a primeira vez)

```bash
npx supabase migration repair --status applied 20260722094711 20260722140617 20260728104552 20260728141204 20260728144123 20260728144200 20260728155440 20260805173541 20260811151043 20260825140252 20260825154058 20260825154505 20260829122829
```

Isso só escreve na tabela de controle `supabase_migrations.schema_migrations`.
**Não executa SQL nenhum** e não toca em dado.

Conferir depois:

```bash
npx supabase migration list
```

Todas as treze devem aparecer com Local **e** Remote preenchidos.

## Conferir se o arquivo bate com o banco real

Este é o teste que prova que o histórico não é ficção:

```bash
npx supabase db diff --linked
```

Saída vazia = o que está aqui descreve exatamente o banco de produção.
Se sair alguma coisa, é diferença que entrou por SQL Editor sem migration
(exatamente o que aconteceu com a v9, ver o cabeçalho daquele arquivo).
**Não apague a diferença**: transforme-a numa migration nova.

## Criar uma migration nova

```bash
npx supabase migration new nome_em_snake_case
```

Escreva o SQL no arquivo gerado e aplique:

```bash
npx supabase db push          # aplica no projeto vinculado
```

Regras da casa, herdadas do que já deu trabalho neste banco:

- **`create or replace view` só aceita acrescentar coluna no fim.** Inserir
  no meio dá erro 42P16. Ver `20260728144123_vendedor_dashboard`.
- **Coluna nova com `default` não-volátil não reescreve a tabela** no
  Postgres ≥ 11 — é seguro em tabela grande. Ver
  `20260829122829_multiplos_premios`.
- **Toda migration que mexe em função/view consumida pelo app** precisa de um
  script de pré-voo somente-leitura antes, como
  `scripts/preflight-v13.sql`. O padrão está lá.
- Migration **nunca** cria bucket de Storage nem usuário — isso é painel.

## Regenerar os tipos TypeScript

`src/lib/types/database.ts` era mantido à mão. Com as migrations no lugar,
ele passa a ser gerado:

```bash
npm run db:types
```

Confira o diff antes de commitar. Se o arquivo gerado divergir do que estava
escrito à mão, **o gerado está certo** — o que estava à mão era a suposição.

## Banco local (opcional)

```bash
npx supabase start     # sobe Postgres + Studio em Docker
npx supabase db reset  # recria do zero aplicando todas as migrations
```

`db reset` é o único lugar onde as treze migrations rodam de verdade, na
ordem, desde o zero. É também o melhor teste de que o histórico é replayável.
Exige Docker.

## Scripts de diagnóstico

`scripts/` guarda SQL **somente leitura**, que não é migration e nunca é
aplicado automaticamente:

- `preflight-v13.sql` — o pré-voo da migration 13; serve de molde para
  qualquer migration arriscada futura.
- `inspecao-estado-do-banco.sql` — levantamento de RLS, grants, publicações
  de Realtime e policies. Foi ele que revelou os cinco achados de 11/08/2026
  (ver `13-roadmap-e-pendencias.md`).
