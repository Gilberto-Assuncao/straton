# STRATON --- SPRINT 4.3 --- TIMESHEETS (SPECIFICATION)

Version: 1.0 Status: Completed per git log (`feat: add timesheets module`), documentation-only gap Last Updated: 2026-07-21

> This file is the original Sprint specification as issued to an AI coding assistant (in Portuguese, as written). No retrospective/as-built summary has been written yet for this Sprint — treat the content below as the plan, not a confirmed implementation report. Cross-check against `git log` and the actual code before assuming a described capability is live.

---

###############################################################
# STRATON
# Sprint 4.3 — Timesheets
# Parte 1/3
###############################################################

==================================================
OBJETIVO
==================================================

Executar exclusivamente a Sprint 4.3.

Implementar o módulo oficial de Timesheets do STRATON.

Este módulo será responsável por consolidar os registros de horas
gerados pelo Time Tracking Engine em folhas de horas organizadas,
auditáveis e preparadas para aprovação.

Os Timesheets deverão permitir consolidação por:

- Funcionário
- Equipe
- Projeto
- Chantier
- Dia
- Semana
- Mês
- Período personalizado

Este módulo será utilizado posteriormente por:

- Payroll
- Workforce Cost
- Profitability
- Reports
- Analytics
- Invoicing
- Compliance
- Exportações contábeis

==================================================
DEPENDÊNCIAS
==================================================

Assumir completamente implementados:

✓ Authentication

✓ Multi-Tenant

✓ Company Management

✓ Workforce

✓ Teams

✓ Projects

✓ Chantiers

✓ Time Tracking Engine

✓ Permissions

✓ RLS

✓ App Shell

✓ Design System

✓ Audit System

Jamais recriar qualquer funcionalidade já existente.

Sempre reutilizar:

- arquitetura;
- serviços;
- componentes;
- schemas;
- tipos;
- permissões;
- padrões de acesso aos dados.

==================================================
PRINCÍPIO CENTRAL
==================================================

O Time Tracking Engine continuará sendo a fonte primária dos
registros individuais de jornada.

O Timesheet será uma consolidação controlada desses registros.

Não duplicar registros de horas sem necessidade.

Não criar uma segunda fonte de verdade.

Cada linha consolidada deverá manter rastreabilidade até os
Time Entries de origem.

==================================================
ESCOPO
==================================================

Implementar:

- Timesheets Dashboard
- Lista de Timesheets
- Detalhes do Timesheet
- Geração de Timesheets
- Consolidação de Time Entries
- Timesheet semanal
- Timesheet mensal
- Período personalizado
- Status
- Aprovação
- Rejeição
- Reabertura controlada
- Bloqueio após aprovação
- Observações
- Histórico
- Busca
- Filtros
- Totais
- Horas normais
- Horas extras preparatórias
- Pausas
- Ajustes
- Exportação básica
- Preparação para Payroll
- Preparação para Reports

==================================================
NÃO IMPLEMENTAR
==================================================

Não implementar nesta Sprint:

- Cálculo de salário
- Folha de pagamento
- Regras fiscais
- Regras trabalhistas específicas por país
- Faturamento automático
- Custos de mão de obra
- Profitability
- GPS
- Geofencing
- Weather
- Scheduling
- Mobile
- Assinatura eletrônica avançada
- Integração contábil completa
- Integração bancária
- Exportações oficiais específicas por país

Essas funcionalidades pertencem às próximas Sprints.

==================================================
ROTAS
==================================================

Criar somente quando necessário.

/dashboard/timesheets

/dashboard/timesheets/new

/dashboard/timesheets/[timesheetId]

/dashboard/timesheets/[timesheetId]/edit

/dashboard/timesheets/[timesheetId]/review

/dashboard/timesheets/[timesheetId]/export

Todas as rotas deverão utilizar:

- Authentication
- Company Context
- Membership
- Permissions
- Multi-Tenant
- RLS

==================================================
MODELO CONCEITUAL
==================================================

Inspecionar o banco e a arquitetura existentes antes de criar
qualquer migration.

Caso já exista estrutura equivalente:

Adaptar.

Jamais recriar tabelas ou enums duplicados.

Estrutura principal sugerida:

timesheets

timesheet_entries

timesheet_approvals

timesheet_adjustments

Criar apenas as estruturas realmente necessárias.

==================================================
MODELO TIMESHEET
==================================================

Tabela principal sugerida:

timesheets

Campos previstos:

id

company_id

employee_id

team_id

period_type

period_start

period_end

status

regular_minutes

overtime_minutes

break_minutes

adjustment_minutes

total_minutes

total_hours

entry_count

generated_at

generated_by

submitted_at

submitted_by

approved_at

approved_by

rejected_at

rejected_by

rejection_reason

locked_at

notes

created_at

updated_at

archived_at

==================================================
MODELO TIMESHEET ENTRY
==================================================

Tabela de ligação ou consolidação sugerida:

timesheet_entries

Campos previstos:

id

company_id

timesheet_id

time_entry_id

employee_id

project_id

chantier_id

team_id

work_date

clock_in

clock_out

break_minutes

worked_minutes

regular_minutes

overtime_minutes

adjustment_minutes

entry_status

created_at

updated_at

==================================================
RASTREABILIDADE
==================================================

Cada Timesheet Entry deverá manter referência ao Time Entry de
origem.

Campo obrigatório:

time_entry_id

Não copiar registros sem preservar origem.

Não permitir que o mesmo Time Entry ativo seja incluído em dois
Timesheets conflitantes para o mesmo período e funcionário.

==================================================
MODELO DE APROVAÇÃO
==================================================

Criar ou adaptar estrutura para aprovação.

Tabela sugerida:

timesheet_approvals

Campos previstos:

id

company_id

timesheet_id

action

actor_id

comment

previous_status

new_status

created_at

A estrutura poderá ser substituída pelo sistema de auditoria
existente caso ele já atenda ao requisito.

Não duplicar o sistema de auditoria sem necessidade.

==================================================
MODELO DE AJUSTES
==================================================

Preparar estrutura controlada para ajustes.

Tabela sugerida:

timesheet_adjustments

Campos previstos:

id

company_id

timesheet_id

time_entry_id

employee_id

adjustment_type

minutes

reason

created_by

created_at

updated_at

Não permitir alteração silenciosa de totais.

Todo ajuste deverá possuir:

- autor;
- motivo;
- data;
- valor anterior quando aplicável;
- valor posterior quando aplicável.

==================================================
RELAÇÕES
==================================================

Cada Timesheet pertence a:

1 Empresa

1 Funcionário

Opcionalmente:

1 Equipe

Cada Timesheet contém:

N Timesheet Entries

Cada Timesheet Entry referencia:

1 Time Entry

1 Funcionário

1 Projeto

1 Chantier

Opcionalmente:

1 Equipe

==================================================
PERÍODOS
==================================================

Implementar os tipos de período:

Daily

Weekly

Monthly

Custom

==================================================
PERÍODO DIÁRIO
==================================================

Daily representa um único dia.

Garantir:

period_start = period_end

Consolidar apenas registros daquele dia.

==================================================
PERÍODO SEMANAL
==================================================

Weekly representa uma semana completa.

Reutilizar configuração existente de início da semana.

Caso não exista configuração:

utilizar segunda-feira como início padrão.

Não codificar regra fixa quando a empresa já possuir configuração.

==================================================
PERÍODO MENSAL
==================================================

Monthly representa o primeiro até o último dia do mês escolhido.

Respeitar timezone da empresa.

Não calcular datas usando exclusivamente UTC sem converter para o
contexto correto.

==================================================
PERÍODO PERSONALIZADO
==================================================

Custom permite selecionar:

period_start

period_end

Validar:

period_start <= period_end

Evitar períodos excessivamente longos quando isso comprometer
performance.

==================================================
STATUS
==================================================

Implementar os seguintes status:

Draft

Open

Submitted

Under Review

Approved

Rejected

Locked

Archived

==================================================
FLUXO DE STATUS
==================================================

Fluxo principal:

Draft

↓

Open

↓

Submitted

↓

Under Review

↓

Approved

↓

Locked

Também permitir:

Under Review

↓

Rejected

↓

Open

↓

Submitted

Approved

↓

Open

somente por reabertura controlada e com permissão elevada.

Archived deverá ser utilizado apenas para arquivamento histórico.

==================================================
DRAFT
==================================================

Draft representa um Timesheet ainda em preparação.

Pode ser:

- recalculado;
- atualizado;
- regenerado;
- ajustado;
- excluído logicamente quando permitido.

Não permitir aprovação direta de Draft sem seguir o fluxo definido.

==================================================
OPEN
==================================================

Open representa Timesheet disponível para revisão do funcionário
ou responsável.

Permitir:

- consulta;
- observações;
- correções autorizadas;
- inclusão de novos Time Entries válidos do período.

==================================================
SUBMITTED
==================================================

Submitted representa Timesheet enviado para revisão.

Após envio:

- restringir alterações comuns;
- preservar snapshot lógico dos dados;
- registrar autor e data;
- impedir edições silenciosas.

==================================================
UNDER REVIEW
==================================================

Under Review representa Timesheet em análise por usuário com
permissão.

Permitir:

- aprovação;
- rejeição;
- comentário;
- devolução controlada;
- ajustes autorizados e auditados.

==================================================
APPROVED
==================================================

Approved representa Timesheet aprovado.

Após aprovação:

- bloquear alterações comuns;
- registrar approved_by;
- registrar approved_at;
- manter rastreabilidade;
- impedir regeneração automática destrutiva.

==================================================
REJECTED
==================================================

Rejected representa Timesheet devolvido para correção.

Obrigatório:

rejection_reason

Registrar:

rejected_by

rejected_at

Permitir retorno controlado para Open.

==================================================
LOCKED
==================================================

Locked representa Timesheet fechado para consumo posterior por:

- Payroll
- Reports
- Cost Management
- Compliance
- Exports

Após Locked:

não permitir alterações comuns.

Qualquer reabertura deverá exigir:

- permissão elevada;
- motivo;
- auditoria;
- invalidação controlada de dependências futuras, quando aplicável.

==================================================
GERAÇÃO DE TIMESHEETS
==================================================

Permitir gerar Timesheets com base nos Time Entries existentes.

Parâmetros mínimos:

- company_id resolvido no servidor;
- employee_id;
- period_type;
- period_start;
- period_end;
- team_id opcional.

A geração deverá:

1. validar empresa ativa;
2. validar funcionário;
3. validar período;
4. buscar Time Entries elegíveis;
5. impedir duplicação;
6. consolidar totais;
7. criar Timesheet;
8. vincular os Time Entries;
9. registrar auditoria;
10. retornar resultado consistente.

==================================================
TIME ENTRIES ELEGÍVEIS
==================================================

Considerar somente Time Entries que:

- pertençam à empresa ativa;
- pertençam ao funcionário;
- estejam dentro do período;
- não estejam arquivados;
- tenham status elegível;
- possuam cálculo válido;
- não estejam associados a Timesheet conflitante;
- respeitem permissões e RLS.

Por padrão, considerar registros:

Finished

Approved

A estratégia exata deverá respeitar as regras já existentes no
Time Tracking Engine.

==================================================
REGISTROS EM ANDAMENTO
==================================================

Não incluir Time Entries com status:

Running

Paused

Esses registros ainda não possuem jornada finalizada.

Exibir aviso quando existirem registros em andamento dentro do
período solicitado.

==================================================
REGISTROS REJEITADOS OU INVÁLIDOS
==================================================

Não incluir automaticamente Time Entries:

Rejected

Archived

Inválidos

Incompletos

Com cálculo negativo

Com clock_out ausente

Permitir que administradores identifiquem os registros excluídos
da consolidação.

==================================================
CONSOLIDAÇÃO
==================================================

Calcular:

regular_minutes

overtime_minutes

break_minutes

adjustment_minutes

total_minutes

total_hours

entry_count

Não aplicar regras trabalhistas nacionais nesta Sprint.

Caso overtime ainda não possua regra configurada:

manter overtime_minutes como zero ou usar estrutura preparatória
já existente.

Não inventar regras legais.

==================================================
CÁLCULO BASE
==================================================

Para cada Timesheet Entry:

worked_minutes deve vir do Time Entry validado.

total_minutes do Timesheet deverá ser calculado a partir da soma
dos registros consolidados e ajustes permitidos.

Exemplo conceitual:

total_minutes =

regular_minutes

+

overtime_minutes

+

adjustment_minutes

Não descontar break_minutes duas vezes.

O Time Tracking já deverá entregar worked_minutes líquido quando
essa for a arquitetura existente.

Inspecionar a implementação anterior antes de calcular.

==================================================
TIMEZONE
==================================================

Todos os períodos e agrupamentos deverão respeitar o timezone da
empresa.

Não agrupar datas apenas pelo valor UTC bruto.

Garantir consistência em:

- virada de dia;
- virada de semana;
- horário de verão;
- registros noturnos;
- turnos atravessando meia-noite.

==================================================
REGISTROS QUE ATRAVESSAM MEIA-NOITE
==================================================

Não dividir Time Entries automaticamente sem verificar a
arquitetura e regras existentes.

Quando um registro atravessar meia-noite:

- preservar o registro original;
- calcular corretamente sua duração;
- atribuir ao período conforme regra definida;
- documentar a decisão.

Caso a aplicação já divida registros por dia:

reutilizar essa estratégia.

==================================================
AGRUPAMENTO
==================================================

Permitir agrupamento de visualização por:

- Dia
- Projeto
- Chantier
- Equipe
- Status do registro

O agrupamento visual não deverá alterar os dados de origem.

==================================================
FUNCIONÁRIO
==================================================

Todo Timesheet deverá pertencer a um funcionário.

Validar:

- funcionário existe;
- funcionário pertence à empresa;
- vínculo está ativo ou historicamente válido para o período;
- usuário possui permissão para acessá-lo.

Não confiar no employee_id enviado pelo frontend.

==================================================
EQUIPE
==================================================

team_id é opcional no Timesheet.

Quando utilizado:

- equipe deverá pertencer à empresa;
- funcionário deverá possuir vínculo compatível;
- registros consolidados deverão ser coerentes com o filtro.

Não impedir a consolidação de registros históricos apenas porque o
funcionário mudou de equipe posteriormente.

==================================================
PROJETOS E CHANTIERS
==================================================

Os Timesheets poderão incluir registros de vários:

- Projetos;
- Chantiers.

Não exigir um único Projeto ou Chantier por Timesheet.

Cada Timesheet Entry deverá preservar:

project_id

chantier_id

Esses campos serão usados posteriormente por:

- Reports;
- Billing;
- Cost Management;
- Profitability.

==================================================
MULTI-TENANT
==================================================

Todos os Timesheets pertencem a exatamente uma empresa.

Nunca permitir:

- acesso cruzado entre empresas;
- geração usando Time Entries de outra empresa;
- inclusão de funcionário de outra empresa;
- aprovação por usuário sem membership válida;
- alteração manual do company_id.

Todas as operações deverão utilizar:

- Company Context;
- Membership;
- Permissions;
- RLS.

==================================================
PERMISSÕES
==================================================

Reutilizar integralmente o sistema de permissões existente.

Não criar um segundo sistema de papéis.

Comportamento esperado, respeitando a política existente:

Owner

Acesso total.

Admin

Geração, edição, submissão, aprovação, rejeição, bloqueio e
reabertura conforme política.

Manager

Gerenciamento de Timesheets dentro de seu escopo autorizado.

Supervisor

Revisão e aprovação operacional quando autorizado.

Employee

Visualização dos próprios Timesheets e submissão quando permitido.

Contractor

Visualização e submissão apenas dos próprios registros quando
autorizado.

Viewer

Somente leitura conforme escopo.

Todas as permissões deverão ser validadas:

- na interface;
- no servidor;
- no banco;
- pelas Policies RLS.

==================================================
APROVAÇÃO
==================================================

Preparar fluxo completo de aprovação.

Ações:

Submit

Start Review

Approve

Reject

Reopen

Lock

Archive

Cada ação deverá:

- validar status atual;
- validar permissão;
- validar empresa;
- registrar ator;
- registrar data;
- registrar auditoria;
- aplicar transição permitida;
- impedir transições inválidas.

==================================================
REJEIÇÃO
==================================================

A rejeição deverá exigir motivo.

Não permitir motivo vazio.

Registrar:

rejection_reason

rejected_by

rejected_at

A interface deverá mostrar claramente o motivo ao funcionário.

==================================================
REABERTURA
==================================================

Permitir reabertura somente quando:

- usuário possui permissão elevada;
- status atual permite a ação;
- motivo foi informado;
- ação foi auditada.

Não permitir reabertura silenciosa de Timesheet Locked.

==================================================
BLOQUEIO
==================================================

Lock deverá impedir:

- edição;
- regeneração;
- remoção de registros;
- ajustes comuns;
- alteração de período;
- mudança de funcionário.

Permitir apenas ações administrativas explicitamente autorizadas.

==================================================
AJUSTES
==================================================

Permitir estrutura para ajustes controlados.

Tipos sugeridos:

Correction

Addition

Deduction

Rounding

Administrative

Não implementar regras automáticas de arredondamento sem
configuração existente.

Todo ajuste deverá exigir:

- minutos;
- motivo;
- autor;
- permissão;
- auditoria.

==================================================
HORAS EXTRAS
==================================================

Preparar suporte para overtime_minutes.

Não implementar cálculo legal específico.

Caso a empresa possua configuração de jornada já existente:

reutilizar a configuração.

Caso não exista:

não inventar limites diários ou semanais.

==================================================
PAUSAS
==================================================

Exibir o total de pausas consolidadas.

Garantir que pausas não sejam descontadas novamente quando
worked_minutes já representar o tempo líquido.

Inspecionar o Time Tracking Engine antes de implementar os totais.

==================================================
EXPORTAÇÃO BÁSICA
==================================================

Preparar exportação de Timesheets.

Formatos mínimos sugeridos:

CSV

JSON

Não implementar PDF avançado nesta Parte.

Não implementar layouts legais específicos.

A exportação deverá respeitar:

- empresa ativa;
- permissões;
- filtros;
- timezone;
- status;
- dados arquivados quando explicitamente solicitados.

==================================================
OBJETIVO FINAL DESTA PARTE
==================================================

Ao concluir esta Parte 1 deverá existir toda a definição
arquitetural e conceitual do módulo Timesheets, incluindo:

- objetivo;
- dependências;
- escopo;
- rotas;
- modelo de dados;
- rastreabilidade;
- períodos;
- status;
- fluxo de aprovação;
- geração;
- consolidação;
- regras de cálculo;
- ajustes;
- permissões;
- Multi-Tenant;
- integração com Time Tracking;
- integração com Employees;
- integração com Teams;
- integração com Projects;
- integração com Chantiers;
- preparação para Payroll;
- preparação para Reports;
- preparação para Cost Management.

Não implementar funcionalidades das Sprints posteriores.

Continuar na Parte 2.