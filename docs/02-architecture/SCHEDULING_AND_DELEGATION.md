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
  company_membership_id      sempre preenchido, um por pessoa
  source                     'direct' | 'team'

worker_availability          ver secção 8
  company_membership_id
  starts_at, ends_at
  kind                       'available' | 'unavailable'
  reason                     opcional
  recurrence                 opcional: semanal
```

Ver secção 5 para a granularidade e secção 8 para a disponibilidade.

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

### Implementado ✅ (2026-08-03)

Duas migrações fecham o modo de colaboração:

**`202608010003_project_collaboration_visibility`** — o dono do projeto passa a
ver quem a parceira lá colocou. Abre três tabelas em conjunto, porque o nome de
um colaborador chega por `project_memberships → company_memberships → users` e
deixar a do meio fechada faz a junção devolver vazio com todas as políticas
individualmente corretas.

**`202608010004_project_partners`** — a tabela do convite. `company_relationships`
diz que duas empresas trabalham juntas; `project_partners` diz que uma parceira
concreta está num projeto concreto, e é isto — não a relação — que concede
acesso. Ser subcontratado de alguém não abre todos os projetos dessa pessoa.

O aperto de mão é assimétrico de propósito:

| Estado | O que a convidada vê |
|---|---|
| `invited` | Só o nome do projeto e de quem convidou — para a resposta não ser às cegas |
| `accepted` | Os estaleiros do projeto, e o direito de lá atribuir os seus próprios trabalhadores |
| `declined` / `revoked` | Nada |

Só a convidada pode aceitar ou recusar; só o dono pode revogar. Isto é imposto
por um *trigger*, não pela política: um `WITH CHECK` não vê a linha anterior e
por isso não distingue "aceitar" de "reverter uma resposta já dada". A linha
nunca é apagada — numa obra belga, o registo de quem esteve no projeto e quando
saiu é a resposta a uma pergunta de responsabilidade solidária.

A mesma migração fecha uma brecha anterior: `project_memberships_tenant_insert`
verificava apenas que a linha trazia o teu próprio `company_id`, nunca que o
projeto era da tua conta. Era inofensiva enquanto os ids de projeto fossem
indescobríveis — e são exatamente as políticas acima que acabam com isso.

Cobertura: `tests/rls/project-collaboration.test.ts` e
`tests/rls/project-partners.test.ts`, onde os controlos negativos são mais
numerosos do que os positivos. Interface: separador **Parceiros** no dashboard
do estaleiro (convidar/revogar) e a caixa de convites recebidos na lista de
estaleiros (aceitar/recusar).

---

## 4. Profundidade da cadeia ✅ decidido

**Máximo 5 níveis.**

Suficiente para casos reais (contratante → 3 subcontratados → especialista) e
evita cadeias absurdas. Requer também proteção contra ciclos: uma empresa não
pode aparecer duas vezes na mesma cadeia.

### O que a rede mostra — e porque para no primeiro nível (2026-08-03)

O ecrã **Empresas → Rede** (`/dashboard/companies/network`) desenha a sua
posição na cadeia: quem o contrata acima, quem você contrata abaixo, parceiros
ao lado, e em cada cartão os projetos que efetivamente partilham.

Para **num só nível**, e isso é a regra a funcionar, não uma lacuna. A política
`company_relationships_read` revela uma linha apenas às duas empresas nela
nomeadas — logo os subcontratados do seu subcontratado não são legíveis para si,
e a interface não pode desenhar o que a base recusa devolver. Nem deve: quem a
empresa B contrata é assunto da empresa B.

A responsabilidade solidária não fica por responder, porque o que a lei exige
provar não é o organigrama da cadeia — é **quem esteve efetivamente no seu
estaleiro**. Isso está no cartão de cada parceiro (quantas pessoas deles em
projetos seus) e no separador Equipa do estaleiro, com nome e empresa de cada
um. O limite de 5 níveis acima aplica-se à delegação em si; a *visibilidade*
nunca passou de um nível e não é para passar.

A inversão de perspetiva — a mesma linha significa o oposto conforme a ponta em
que se está — está isolada em `src/features/partners/chain.ts` e testada em
`tests/unit/features/partners/chain.test.ts`. Trocá-la poria o subcontratado na
faixa de "quem o contrata": uma resposta errada que o build, os tipos e o
renderizador aceitam sem reclamar.

---

## 5. Granularidade da atribuição ✅ decidido

**Ambos** — atribui-se a pessoas e a equipas.

Atribuir à *Equipa Solar* e o sistema expande para os membros dela **na data da
atribuição**. Dá a conveniência de marcar por equipa sem perder o registo de
quem esteve lá — que é o que a folha de horas e a conformidade exigem.

```
assignments
  team_id                    opcional: a equipa marcada, se foi assim que se marcou

assignment_assignees
  assignment_id
  company_membership_id      sempre preenchido, um por pessoa
  source                     'direct' | 'team'   ← como esta pessoa aqui chegou
```

### O ponto crítico: expandir e congelar

A expansão da equipa para pessoas tem de ser **materializada no momento da
atribuição**, não calculada quando alguém abre o ecrã.

Se for calculada em tempo real, uma pessoa que saia da equipa amanhã desaparece
retroativamente do trabalho que fez ontem — e a folha de horas deixa de bater
certo com quem lá esteve. Para conformidade belga, isso é inaceitável: tem de
haver registo de quem estava atribuído naquele dia.

Por isso `assignment_assignees` guarda sempre as pessoas, mesmo quando a marcação
foi feita por equipa. O campo `source` preserva a intenção original (marcado por
equipa vs pessoa a pessoa), o que permite à interface mostrar "Equipa Solar" em
vez de cinco nomes, sem perder o dado.

### Alterações posteriores à equipa

Se a composição da equipa mudar **antes** da data, a atribuição não se atualiza
sozinha — seria uma alteração silenciosa a trabalho já planeado. Em vez disso, a
interface deve sinalizar a divergência e deixar o supervisor decidir se
re-expande.

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

## 8. Disponibilidade ⚠️ lacuna identificada

O modelo acima deixa o gestor marcar às cegas: nada impede atribuir trabalho a
quem está de férias, de baixa, ou já colocado noutra obra à mesma hora. O
conflito só aparece quando alguém reclama.

Sem disponibilidade, "escalar" é adivinhar. É a lacuna mais séria do desenho e
convém resolvê-la **antes** de implementar a agenda — acrescentar depois obriga
a rever ecrãs e validações já feitos.

### O que é preciso

```
worker_availability
  company_membership_id
  starts_at, ends_at
  kind          'available' | 'unavailable'
  reason        férias, baixa, formação, preferência pessoal
  recurrence    opcional: ex. indisponível às sextas
```

Duas validações no momento da atribuição:

1. **Indisponibilidade declarada** — bloqueia ou avisa, conforme o motivo
2. **Sobreposição** — a mesma pessoa em duas atribuições no mesmo intervalo

A segunda é a mais valiosa e não precisa da tabela nova: já é derivável de
`assignments` + `assignment_assignees`. Vale a pena implementá-la desde o
primeiro dia.

### Troca de turnos

O trabalhador propõe trocar uma atribuição com um colega, sujeito a aprovação do
supervisor. Não está no modelo atual. Menos urgente que a disponibilidade, mas
implica um estado adicional na atribuição — melhor prevê-lo agora do que
retrofitar.

---

## 9. Referência competitiva: Deputy

O [Deputy](https://www.deputy.com/) foi a inspiração inicial do produto. Vale a
pena registar o que valida e o que não cobre.

### O que valida

O ciclo central deles é *"from first hire to final pay"*: escala → ponto → folha
de horas → folha de pagamento. É exatamente o ciclo identificado na secção 1
como estando cortado a meio. O desenho vai na direção certa.

### Onde o STRATON é genuinamente diferente

O Deputy suporta multi-localização e franquias, com *roll-up e drill-down a
todos os níveis*. Mas isso é **uma organização com muitos locais** — um dono,
várias lojas. Não há problema de consentimento porque os dados são todos do
mesmo proprietário.

A cadeia do STRATON é de **entidades jurídicas independentes**, cada uma com os
seus trabalhadores, contratos e responsabilidade legal. A regra de visibilidade
da secção 3 — delegação fecha, convite ao projeto abre — não tem equivalente no
Deputy, e a arquitetura deles não a comporta.

**O diferencial é a cadeia entre empresas, não a escala.**

### Onde não se deve competir

O Deputy tem escalonamento automático, previsão de procura, regras de pagamento
configuráveis, comunicação de equipa, gestão de desempenho e onboarding. Tem
centenas de engenheiros e anos de maturidade.

Tentar igualar funcionalidade a funcionalidade é uma corrida que não se ganha. A
vantagem está no nicho que eles não servem: **cadeias de subcontratação belgas**,
com responsabilidade solidária, conformidade local e delegação entre empresas.
Uma empresa belga de construção com três subcontratados não tem hoje boa opção —
e o Deputy não vai construí-la, porque o mercado dele é retalho e hotelaria
multi-loja.

Competir em profundidade nesse nicho, não em largura.

### Dependência que isto expõe

O Deputy tem app de relógio de ponto. Os trabalhadores do STRATON estão em
telhados e obras — não abrem um portátil. O mobile está como *planeado, não
especificado* ([#12](https://github.com/Gilberto-Assuncao/straton/issues/12)),
mas para a Agenda funcionar em campo é **pré-requisito, não extra**.

---

## 10. Sequência recomendada

1. **Fechar os bloqueadores atuais** ([#1](https://github.com/Gilberto-Assuncao/straton/issues/1), [#4](https://github.com/Gilberto-Assuncao/straton/issues/4), [#21](https://github.com/Gilberto-Assuncao/straton/issues/21)) — um menu reorganizado com botões que não funcionam continua a não servir
2. **Página de projeto com separadores** — a página já existe, precisa de estrutura
3. **Meteorologia na agenda** — o código já existe, é ligá-lo
4. **Disponibilidade** (secção 8) — antes da agenda, não depois
5. **Agenda: modelo + RLS + ecrãs** — a peça grande. Depende de mobile ([#12](https://github.com/Gilberto-Assuncao/straton/issues/12)) para uso real em campo
6. **Delegação entre empresas** — depende de [#20](https://github.com/Gilberto-Assuncao/straton/issues/20) (convidar empresa sem conta)
7. **Reorganizar o menu** — só no fim, quando houver o que reorganizar

Nota: a Agenda é a maior funcionalidade discutida até agora. Exige migração,
RLS entre empresas e ecrãs novos. É a coisa certa a construir — mas convém
entrar nela sem frentes abertas.
