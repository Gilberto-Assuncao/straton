# STRATON — O que falta para a plataforma funcionar a 100%

> Levantamento feito em 2026-07-26 contra o código em `main` e a base de dados
> de produção (`ioozswzauonfmwohfvpl`). Cada linha é verificável — não é
> especulação.

---

## 1. Diagnóstico: a plataforma está construída, mas vazia

O código cobre praticamente todos os módulos. O problema principal **não é
funcionalidade em falta — é ausência de dados de referência**. Das 35 tabelas
em produção, 21 estão completamente vazias.

| Tabela | Linhas | Consequência prática |
|---|---:|---|
| `role_permissions` | **0** | 🔴 As 8 permissões existem mas nenhum papel as tem. O sistema de permissões não decide nada. |
| `time_classifications` | **0** | 🔴 A consolidação de folha de pagamento não consegue classificar horas (normal/extra/viagem). |
| `report_templates` / `report_template_fields` | **0** | 🔴 O módulo Field Reports não tem formulários — está inutilizável. |
| `payroll_periods` / `payroll_consolidations` | **0** | 🔴 A página Payroll & Accounting não tem períodos para mostrar. |
| `team_memberships` | **0** | 🟠 Existe 1 equipa, sem ninguém dentro. KPI "equipas ativas" dá sempre 0. |
| `notifications` | **0** | 🟠 O sino de notificações está permanentemente vazio. |
| `project_memberships` | **0** | 🟠 Projetos sem pessoas atribuídas. |
| `operational_reports` | **0** | 🟠 Sem histórico operacional. |
| `certificates`, `professional_profiles` | **0** | 🟡 Perfis de trabalhador incompletos. |
| `localization_settings`, `audit_logs`, `reports` | **0** | 🟡 Sem trilha de auditoria nem exportações. |

E os que têm dados, têm quase nada: **1** projeto, **1** obra, **1** equipa,
**1** timesheet, **1** entrada de horas, **3** registos de funcionário,
**4** empresas (duas duplicadas + uma "Empresa Teste QA").

**É por isto que o dashboard mostra zeros em todo o lado.**

➡️ Resolvido pelo ficheiro `supabase/seed-demo.sql` (ver secção 5).

---

## 2. Bloqueadores reais de produção

Ordenados por impacto. Sem estes, a plataforma não pode receber clientes reais.

### 🔴 Crítico

| # | Item | Porquê bloqueia | Issue |
|---|---|---|---|
| 1 | **SMTP próprio (Resend)** | Sem isto ninguém recupera a palavra-passe nem confirma a conta. O Supabase partilhado tem limite baixo e entrega pouco fiável. Já confirmado em produção: o email não chega. | [#16](https://github.com/Gilberto-Assuncao/nextime/issues/16) |
| 2 | **Editar/desativar funcionário** | A UI existe mas não está ligada a nenhuma action — o botão não faz nada. CRUD de pessoas incompleto. | [#1](https://github.com/Gilberto-Assuncao/nextime/issues/1) |
| 3 | **Obras (Sites) só de leitura** | Não há forma de criar, editar ou apagar uma obra pela interface. Só por SQL. | [#4](https://github.com/Gilberto-Assuncao/nextime/issues/4) |
| 4 | **Templates de relatório sem UI** | Não há forma de criar formulários de campo pela interface. Sem templates, o módulo não funciona. | [#21](https://github.com/Gilberto-Assuncao/nextime/issues/21) |

### 🟠 Importante

| # | Item | Porquê | Issue |
|---|---|---|---|
| 5 | **Convidar empresa sem conta STRATON** | O fluxo de parceiros assume que a outra empresa já está registada. | [#20](https://github.com/Gilberto-Assuncao/nextime/issues/20) |
| 6 | **Mapa ao vivo não é tempo real** | Mostra o último check-in, não presença real. O nome induz em erro. | [#5](https://github.com/Gilberto-Assuncao/nextime/issues/5) |
| 7 | **Tradução fora do dashboard** | `components/auth/` 1/13 ficheiros, `app-shell/` 1/11, `companies/` 1/16. Também as 18 mensagens de erro de auth. | [#22](https://github.com/Gilberto-Assuncao/nextime/issues/22), [#13](https://github.com/Gilberto-Assuncao/nextime/issues/13), [#14](https://github.com/Gilberto-Assuncao/nextime/issues/14) |
| 8 | **Rebrand — painéis externos** | Código e docs já feitos. Falta renomear: repositório GitHub `nextime`, projeto Vercel `nextime`, projeto Supabase, pasta local. | [#18](https://github.com/Gilberto-Assuncao/nextime/issues/18) |
| 9 | **Modo "ver como" (suporte)** | Sem isto não há forma de dar apoio a um cliente sem pedir as credenciais dele. | [#19](https://github.com/Gilberto-Assuncao/nextime/issues/19) |
| 10 | **Roster + relatório de conformidade belga** | Requisito legal para o mercado-alvo. | [#3](https://github.com/Gilberto-Assuncao/nextime/issues/3) |

### 🟡 Menor

| # | Item | Issue |
|---|---|---|
| 11 | Login social (Google, Apple, Microsoft) | [#15](https://github.com/Gilberto-Assuncao/nextime/issues/15) |
| 12 | Lembretes de pontualidade: override por utilizador + limite de cron do plano Hobby | [#6](https://github.com/Gilberto-Assuncao/nextime/issues/6) |

---

## 3. Módulos desativados na navegação

Estão no menu marcados como `disabled: true` — visíveis mas não clicáveis.
Decidir: implementar ou remover do menu (mostrar algo que não funciona
prejudica a percepção do produto).

| Módulo | Rota | Estado |
|---|---|---|
| Expenses | `/dashboard/expenses` | Sem página. Desativado no menu. |
| STRATON Connect | `/dashboard/connect` | Sem página. Desativado no menu. |
| Marketplace | `/dashboard/marketplace` | Sem página. Desativado no menu. |

---

## 4. Qualidade e infraestrutura

| Área | Estado atual | O que falta |
|---|---|---|
| **Testes** | Apenas **3** ficheiros (`companies/validation`, `teams/validation`, `weather/alerts`) | Cobertura para os fluxos críticos: aprovação de horas, consolidação de folha, permissões/RLS, criação de empresa |
| **CI** | `.github/workflows/ci.yml` existe | Confirmar que corre `lint` + `typecheck` + `test` + `build` em cada PR |
| **Migrações** | 25 migrações, schema sólido | ✅ Sem dívida aparente |
| **RLS** | Ativo nas 35 tabelas | Falta um teste automatizado que prove o isolamento entre empresas |
| **Observabilidade** | Nenhuma | Sem Sentry/logging estruturado, um erro em produção passa despercebido |
| **Backups** | Padrão do Supabase | Definir e testar política de restauro |

---

## 5. Dataset de demonstração

Ficheiro: **`supabase/seed-demo.sql`**

Cria três empresas totalmente operacionais, cada uma com colaboradores,
estrutura e histórico — para que todos os módulos tenham o que mostrar.

### Empresas

| Empresa | Setor | Cidade | Pessoas | Idioma |
|---|---|---|---:|---|
| **BELNEX ENERGY** | Energia solar / instalação fotovoltaica | Bruxelas | 6 | fr |
| **NORDCLEAN SERVICES** | Limpeza industrial e de escritórios | Antuérpia | 5 | nl |
| **GEOTECH ENGINEERING** | Manutenção técnica e topografia | Liège | 5 | fr |

Mais duas empresas apenas-cliente (`Résidence Le Parc`, `Havenbedrijf Noord`)
para dar sentido às relações cliente/subcontratado e aos campos
`client_company_id` de projetos e obras.

### Cobertura por pessoa

Cada empresa tem a pirâmide completa de papéis, para que os **três modos do
dashboard** (supervisor / admin / RH) sejam todos testáveis:

- 1 × `owner` + `admin`
- 1 × `manager` / `supervisor`
- 1 × `hr` ou `finance` + `accountant`
- 2 a 3 × `employee` / `worker` / `contractor` / `apprentice` / `temporary`

### Dados gerados

| Domínio | Conteúdo |
|---|---|
| **Permissões** | Matriz `role_permissions` completa para os 11 papéis × 8 permissões |
| **Equipas** | 6 equipas com líder, cor, ícone e membros atribuídos |
| **Projetos** | 8 projetos com orçamento, gasto, prioridade, centro de custo e estados variados (`active`, `planning`, `completed`, `paused`) |
| **Obras** | 7 obras com morada, GPS real (Bruxelas/Namur/Antuérpia/Liège), PO e referência |
| **Tarefas** | 10 tarefas ligadas a projetos |
| **Horas** | **6 semanas** de registos por trabalhador de campo, gerados dia a dia: semanas antigas `approved`, a anterior `submitted`, a atual `draft` |
| **Divergências** | Turnos de 11h propositados em semanas alternadas, para alimentar o KPI "divergências de horas" |
| **Ausência** | Uma falta real a meio do período, para o KPI "sem registo hoje" não ser artificial |
| **Folha** | 2 períodos por empresa (anterior `closed`, atual `in_review`) com consolidação por trabalhador: minutos esperados/registados/aprovados, km, despesas, benefícios |
| **Classificações** | 7 classificações de tempo por empresa (NORM, OT25, OT50, TRAV, SICK, HOL, TRAIN), distribuídas nas consolidações |
| **Relatórios de campo** | 4 templates com 15 campos tipados (número, select, boolean, multiselect, assinatura, texto) |
| **Relatórios submetidos** | 8 relatórios cobrindo **todos** os estados: `draft`, `submitted`, `under_review`, `approved`, `changes_requested` — com valores preenchidos e histórico de ações |
| **Exportações** | 4 pedidos no módulo Reports (`completed` e `pending`) |
| **Notificações** | 8 notificações reais (lidas e não lidas) de todos os tipos: `INFO`, `WARNING`, `ACTION_REQUIRED`, `SUCCESS` |
| **Certificados** | 8 certificados belgas realistas (VCA, BA5, trabalho em altura, gases refrigerantes) — alguns a expirar em breve |
| **Perfis** | 3 perfis profissionais com especialidades e idiomas |

### Como aplicar

O ficheiro é **idempotente** — apaga os dados de demonstração anteriores antes
de inserir. Todas as linhas usam o prefixo de UUID `d000000x-`, portanto podem
ser removidas sem tocar em dados reais.

```bash
psql "$DATABASE_URL" -f supabase/seed-demo.sql
```

Termina com uma query de verificação que imprime a contagem por tabela.

### Contas de acesso

Palavra-passe para todas: `straton-demo-2026`

| Papel | Email |
|---|---|
| Owner / Admin | `marc.dubois@belnex.straton.demo` |
| Manager / Supervisor | `sofia.almeida@belnex.straton.demo` |
| RH / Folha | `elodie.martin@belnex.straton.demo` |
| Técnico de campo | `joao.ferreira@belnex.straton.demo` |
| Owner (limpeza) | `anouk.peeters@nordclean.straton.demo` |
| Owner (técnica) | `thomas.janssen@geotech.straton.demo` |

Os domínios `.straton.demo` não existem — nenhum email real é enviado.

---

## 6. Ordem de trabalho sugerida

1. **Aplicar `seed-demo.sql`** — desbloqueia a validação de todos os módulos de uma vez
2. **SMTP Resend** ([#16](https://github.com/Gilberto-Assuncao/nextime/issues/16)) — sem isto não há onboarding real
3. **Fechar o CRUD**: funcionários ([#1](https://github.com/Gilberto-Assuncao/nextime/issues/1)), obras ([#4](https://github.com/Gilberto-Assuncao/nextime/issues/4)), templates ([#21](https://github.com/Gilberto-Assuncao/nextime/issues/21))
4. **Terminar a tradução** ([#22](https://github.com/Gilberto-Assuncao/nextime/issues/22))
5. **Rebrand nos painéis** ([#18](https://github.com/Gilberto-Assuncao/nextime/issues/18))
6. **Testes dos fluxos críticos** + prova de isolamento RLS
7. **Observabilidade** antes do primeiro cliente real
8. Decidir o destino dos módulos desativados (Expenses, Connect, Marketplace)
