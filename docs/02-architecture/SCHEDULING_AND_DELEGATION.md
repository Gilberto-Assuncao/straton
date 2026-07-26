# Agenda e delegação entre empresas

> Decisões de produto tomadas em 2026-07-26. Este documento existe para não
> se rediscutir o mesmo daqui a uma semana. Nada aqui está implementado ainda.

---

## 1. O problema

A plataforma fecha metade do ciclo de trabalho. O colaborador **regista** o que
já fez (`timesheets`), mas nada lhe **diz** o que vai fazer.

Verificado no schema: das 35 tabelas, nenhuma guarda uma programação. A mais
próxima é `tasks`, que tem apenas `id, company_id, project_id, name, status` —
sem data, sem hora, sem responsável. É uma etiqueta para classificar horas, não
uma atribuição de trabalho.

Consequência prática: o menu parece mal organizado porque vários módulos tentam
compensar uma peça em falta.

O ciclo completo pretendido:

```
Agenda  →  Registo de Horas  →  Aprovações  →  Folha
(o que vais fazer)  (o que fizeste)
```

Hoje começa a meio.

---

## 2. Modelo de dados proposto

```
assignments
  id
  company_id                 empresa dona da atribuição
  project_id, site_id        onde
  starts_at, ends_at         quando
  title                      o quê
  instructions               como
  status                     planeada → enviada → aceite → em curso → concluída
  created_by
  delegated_to_company_id    para quem foi delegada (se aplicável)
  parent_assignment_id       elo da cadeia (self-FK)
  chain_depth                nível na cadeia, máximo 5

assignment_assignees
  assignment_id
  company_membership_id      e/ou team_id — ver questão em aberto
```

O `parent_assignment_id` é o que torna a cadeia possível sem casos especiais no
código: a empresa que recebe vê a atribuição como **sua**, apenas ligada à
origem. Delega outra vez e a estrutura repete-se.

### As três vistas saem da mesma tabela

| Quem | Vê |
|---|---|
| Colaborador | as atribuições onde é *assignee* |
| Supervisor | todas as da sua empresa |
| Empresa que delegou | a atribuição-filha, conforme a regra de visibilidade |

---

## 3. Regra de visibilidade na cadeia ✅ decidido

Há **dois modos distintos**, e a diferença é quem consentiu:

| Modo | O que o contratante vê |
|---|---|
| **Delegação** — "toma o serviço, entrega-me feito" | Apenas o **estado**. Caixa fechada. |
| **Colaboração no projeto** — convida a empresa, ela coloca os seus no projeto | Vê **estado e pessoas** |

### Porque esta regra é boa

O consentimento é um **ato explícito da empresa subcontratada**, não uma
consequência automática da subcontratação. Sob o RGPD é exatamente o que se
quer: a empresa B decide expor os dados dos seus trabalhadores ao aderir ao
projeto — não lhe é imposto pela cadeia.

Resolve também a tensão com a **responsabilidade solidária na cadeia de
subcontratação** na Bélgica (o contratante principal responde por salários e
segurança social não pagos pelo subcontratado): quem precisa de provar
diligência convida para o projeto; quem só quer entregar um serviço fechado não
expõe ninguém.

### O schema já suporta isto

`project_memberships` **não tem** nenhuma restrição a obrigar que o `company_id`
do membro coincida com a empresa dona do projeto:

```
project_memberships_pkey                      PRIMARY KEY (id)
project_memberships_company_id_fkey           FK → companies(id)
project_memberships_company_membership_id_fkey FK → company_memberships(id)
project_memberships_project_id_fkey           FK → projects(id)
project_memberships_check                     CHECK (left_at IS NULL OR left_at >= joined_at)
```

Estruturalmente, um funcionário da Empresa B já pode ser adicionado a um projeto
da Empresa A. Falta apenas a política de RLS que o autorize.

---

## 4. Profundidade da cadeia ✅ decidido

**Máximo 5 níveis.**

Suficiente para casos reais (contratante → 3 subcontratados → especialista) e
evita cadeias absurdas. Requer também proteção contra ciclos: uma empresa não
pode aparecer duas vezes na mesma cadeia.

---

## 5. Questão em aberto ⏳

**Atribui-se a pessoas, a equipas, ou a ambos?**

Recomendação: **ambos**. Atribuir à *Equipa Solar* e o sistema expande para os
membros dela na data. Dá a conveniência de marcar por equipa sem perder o
registo de quem esteve lá — que é o que a folha de horas e a conformidade
precisam.

Impacto da decisão:

- **Ambos** → `assignment_assignees` com `company_membership_id` e um `team_id`
  opcional na atribuição
- **Só equipas** → `assignment_assignees` desaparece, fica um `team_id` na
  atribuição

---

## 6. Impacto na navegação

A Agenda **não** é um separador do projeto. É um módulo de topo, porque a
pergunta "o que tenho para fazer hoje?" não começa num projeto.

### Menu proposto: de 15 itens para 8

```
GERAL
  Painel
  Agenda              ← nova. A minha, ou a da equipa se for supervisor
  Mapa em tempo real

OPERAÇÕES
  Projetos            ← absorve Obras + Relatórios de Campo
  Aprovações
  Registo de Horas

EQUIPA
  Pessoas             ← funde Força de Trabalho + Quadro de Funções
  Equipas

FINANCEIRO
  Folha & Contabilidade
  Relatórios
```

### A redundância que isto elimina

O menu atual cobre o mesmo conceito em vários sítios:

| Conceito | Menus hoje |
|---|---|
| Pessoas | Equipas · Força de Trabalho · Quadro de Funções → **3** |
| Relatórios | Relatórios de Campo · Relatórios → **2** |
| Tempo | Registo de Horas · Aprovações → **2** |
| Onde se trabalha | Projetos · Obras → **2** |

Um supervisor que queira ver a sua equipa tem três sítios possíveis e nenhuma
pista de qual é o certo.

### O projeto como centro

```
Projeto: Le Parc — Rooftop PV 320 kWp
├── Visão geral    orçamento, prazo, progresso
├── Agenda         atribuições deste projeto + previsão do tempo
├── Obras          Block A · Block C (mapa + GPS)
├── Equipa         atribuídos, e quem está em campo hoje
├── Horas          registos deste projeto
└── Relatórios     relatórios de campo deste projeto
```

Obras deixa de ser menu e passa a separador — que é o que uma obra é: o sítio
físico onde o projeto acontece. A relação já existe (`sites.project_id`).

---

## 7. Meteorologia na agenda

O módulo já existe (`src/features/weather/alerts.ts` e `data.ts`) e está a ser
usado apenas na página de Obras — onde ninguém vai para planear.

Ao marcar trabalho em telhado para quinta-feira, ver
`⚠️ Vento 55 km/h — trabalho em altura desaconselhado` muda a decisão. Para
instalação de painéis, é segurança, não conveniência.

O código de alertas já está escrito. Falta mostrá-lo no momento da decisão.

---

## 8. Sequência recomendada

1. **Fechar os bloqueadores atuais** ([#1](https://github.com/Gilberto-Assuncao/straton/issues/1), [#4](https://github.com/Gilberto-Assuncao/straton/issues/4), [#21](https://github.com/Gilberto-Assuncao/straton/issues/21)) — um menu reorganizado com botões que não funcionam continua a não servir
2. **Página de projeto com separadores** — a página já existe, precisa de estrutura
3. **Meteorologia na agenda** — o código já existe, é ligá-lo
4. **Agenda: modelo + RLS + ecrãs** — a peça grande
5. **Delegação entre empresas** — depende de [#20](https://github.com/Gilberto-Assuncao/straton/issues/20) (convidar empresa sem conta)
6. **Reorganizar o menu** — só no fim, quando houver o que reorganizar

Nota: a Agenda é a maior funcionalidade discutida até agora. Exige migração,
RLS entre empresas e ecrãs novos. É a coisa certa a construir — mas convém
entrar nela sem frentes abertas.
