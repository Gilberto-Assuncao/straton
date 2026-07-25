# STRATON --- SPRINT 4.2 --- TIME TRACKING ENGINE (SPECIFICATION)

Version: 1.0 Status: Completed per git log (`feat: add time tracking module`), documentation-only gap Last Updated: 2026-07-21

> This file is the original Sprint specification as issued to an AI coding assistant (in Portuguese, as written). No retrospective/as-built summary has been written yet for this Sprint — treat the content below as the plan, not a confirmed implementation report. Cross-check against `git log` and the actual code before assuming a described capability is live.

---

###############################################################
# STRATON
# Sprint 4.2 — Time Tracking Engine
# Parte 1/3
###############################################################

==================================================
OBJETIVO
==================================================

Executar exclusivamente a Sprint 4.2.

Implementar o motor oficial de registro de horas do STRATON.

Este módulo será responsável por registrar toda a jornada de
trabalho dos colaboradores.

Todas as horas registradas serão utilizadas posteriormente pelos
módulos:

- Timesheets
- Scheduling
- Payroll
- Reports
- Analytics
- Cost Management
- Productivity
- GPS
- Geofencing

O Time Tracking deverá ser totalmente independente da interface,
permitindo futuramente integração com:

- Web
- Mobile
- API
- QR Code
- NFC
- Biometria

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

✓ Permissions

✓ RLS

✓ App Shell

✓ Design System

Jamais recriar funcionalidades existentes.

Sempre reutilizar a arquitetura atual.

==================================================
ESCOPO
==================================================

Implementar:

Clock In

Clock Out

Registro Manual

Pausas

Continuação da Jornada

Status

Dashboard

Lista de Registros

Detalhes

Busca

Filtros

Validações

Aprovação (estrutura)

Histórico

Integração com:

Projetos

Chantiers

Employees

==================================================
NÃO IMPLEMENTAR
==================================================

Não implementar:

GPS

Geofencing

Weather

Payroll

Invoice

Custos

Timesheets

Scheduling

Mobile

QR Code

Biometria

API Pública

Estas funcionalidades pertencem às próximas Sprints.

==================================================
ROTAS
==================================================

Criar somente quando necessário.

/dashboard/time-tracking

/dashboard/time-tracking/new

/dashboard/time-tracking/[entryId]

/dashboard/time-tracking/[entryId]/edit

==================================================
MODELO DE DADOS
==================================================

Inspecionar a arquitetura antes de criar migrations.

Criar ou adaptar estrutura equivalente.

Tabela principal:

time_entries

Campos previstos:

id

company_id

employee_id

project_id

chantier_id

team_id

entry_type

status

clock_in

clock_out

break_minutes

worked_minutes

worked_hours

notes

approved_by

approved_at

created_by

updated_by

created_at

updated_at

archived_at

==================================================
RELAÇÕES
==================================================

Cada registro pertence a:

1 Empresa

1 Funcionário

1 Projeto

1 Chantier

Opcionalmente:

1 Equipe

==================================================
ENTRY TYPE
==================================================

Implementar:

Clock In

Manual

Adjustment

Imported

==================================================
STATUS
==================================================

Pending

Running

Paused

Finished

Approved

Rejected

Archived

==================================================
CLOCK IN
==================================================

Permitir iniciar jornada.

Ao iniciar:

registrar data

registrar horário

registrar funcionário

registrar projeto

registrar chantier

registrar equipe (quando existir)

Não permitir duas jornadas abertas simultaneamente.

==================================================
CLOCK OUT
==================================================

Permitir finalizar jornada.

Ao finalizar:

registrar horário final

calcular tempo trabalhado

descontar pausas

calcular horas

atualizar status

==================================================
PAUSAS
==================================================

Implementar estrutura para pausas.

Permitir:

Iniciar pausa

Finalizar pausa

Registrar minutos

Não implementar múltiplos tipos de pausa.

==================================================
REGISTRO MANUAL
==================================================

Permitir criar registros manualmente.

Obrigatório:

Funcionário

Projeto

Chantier

Data

Hora Inicial

Hora Final

Observações

==================================================
PROJETOS
==================================================

Todo registro deve possuir:

project_id

Jamais permitir registros sem Projeto.

==================================================
CHANTIERS
==================================================

Todo registro deve possuir:

chantier_id

Jamais permitir registros sem Chantier.

==================================================
EMPLOYEES
==================================================

Todo registro pertence a um funcionário.

Validar sempre:

empresa

permissão

vínculo

==================================================
TEAMS
==================================================

Equipe é opcional.

Caso exista:

validar pertencimento à empresa.

==================================================
MULTI-TENANT
==================================================

Todos os registros pertencem à empresa ativa.

Nunca permitir acesso entre empresas.

Todas as consultas deverão utilizar:

Company Context

Membership

Permissions

RLS

==================================================
REGRAS DE NEGÓCIO
==================================================

Não permitir:

Clock In duplicado

Clock Out inexistente

Horas negativas

Datas futuras (salvo administradores)

Projeto inválido

Chantier inválido

Funcionário inválido

Equipe inválida

==================================================
OBJETIVO FINAL DESTA PARTE
==================================================

Ao concluir esta Parte 1 deverá existir toda a estrutura conceitual
do Time Tracking Engine, incluindo:

- arquitetura;
- modelo de dados;
- relacionamentos;
- regras de negócio;
- status;
- tipos de registro;
- Clock In;
- Clock Out;
- Pausas;
- integração com Projects;
- integração com Chantiers;
- integração com Employees;
- integração com Teams;
- preparação para Timesheets.

Não implementar funcionalidades da Sprint 4.3 nesta etapa.

Continuar na Parte 2.
###############################################################
# STRATON
# Sprint 4.2 — Time Tracking Engine
# Parte 2/3
###############################################################

==================================================
IMPLEMENTAÇÃO
==================================================

Implementar o módulo Time Tracking utilizando toda a arquitetura
existente do projeto.

Reutilizar obrigatoriamente:

- Components
- Services
- Repositories
- Server Actions
- Validation
- Permissions
- Design System
- App Shell
- Data Layer
- Hooks

Jamais criar uma arquitetura paralela.

==================================================
CRUD
==================================================

Implementar:

Create Time Entry

Read Time Entry

Update Time Entry

Archive Time Entry

Não implementar DELETE físico.

Utilizar Soft Delete.

==================================================
DASHBOARD
==================================================

Criar Dashboard operacional.

Exibir:

Horas Hoje

Horas Semana

Horas Mês

Registros Pendentes

Registros em Andamento

Registros Finalizados

Horas Extras

Total de Funcionários Trabalhando

Última Atualização

==================================================
LISTA
==================================================

Criar tabela principal.

Exibir:

Funcionário

Projeto

Chantier

Equipe

Clock In

Clock Out

Horas Trabalhadas

Pausa

Status

Tipo

Última Atualização

Ações

==================================================
DETALHES
==================================================

Criar tela completa.

Exibir:

Resumo

Funcionário

Projeto

Chantier

Equipe

Data

Clock In

Clock Out

Pausa

Tempo Trabalhado

Horas Trabalhadas

Status

Tipo

Observações

Histórico de alterações

==================================================
CLOCK IN
==================================================

Criar ação para iniciar jornada.

Ao executar:

Registrar horário inicial

Atualizar Status para Running

Criar registro

Associar:

Empresa

Funcionário

Projeto

Chantier

Equipe (quando existir)

==================================================
CLOCK OUT
==================================================

Criar ação para finalizar jornada.

Ao executar:

Registrar horário final

Calcular minutos trabalhados

Descontar pausas

Atualizar worked_minutes

Atualizar worked_hours

Alterar Status para Finished

==================================================
PAUSAS
==================================================

Implementar:

Start Break

End Break

Atualizar:

break_minutes

Não permitir:

Pausa sem jornada iniciada

Pausa duplicada

Clock Out durante pausa ativa

==================================================
REGISTRO MANUAL
==================================================

Permitir criação manual.

Obrigatório:

Funcionário

Projeto

Chantier

Data

Hora Inicial

Hora Final

Motivo

Observações

Registrar:

created_by

==================================================
EDIÇÃO
==================================================

Permitir editar:

Clock In

Clock Out

Pausa

Projeto

Chantier

Equipe

Observações

Status

Jamais permitir alteração manual de:

company_id

employee_id

created_at

worked_minutes (manual)

worked_hours (manual)

Os cálculos deverão ser automáticos.

==================================================
CÁLCULO DAS HORAS
==================================================

Implementar cálculo automático.

worked_minutes =

(clock_out - clock_in)

-

break_minutes

worked_hours =

worked_minutes / 60

Nunca permitir:

Horas negativas

Resultado inválido

==================================================
HORAS EXTRAS
==================================================

Preparar estrutura para:

Overtime

Não calcular regras trabalhistas nesta Sprint.

Criar apenas os campos necessários.

==================================================
BUSCA
==================================================

Implementar busca por:

Funcionário

Projeto

Chantier

Equipe

Observações

==================================================
FILTROS
==================================================

Criar filtros:

Funcionário

Projeto

Chantier

Equipe

Status

Tipo

Data

Período

Arquivados

==================================================
ORDENAÇÃO
==================================================

Permitir ordenar por:

Funcionário

Projeto

Data

Clock In

Clock Out

Horas

Status

==================================================
PAGINAÇÃO
==================================================

Utilizar paginação existente.

Jamais carregar todos os registros.

==================================================
VALIDAÇÕES
==================================================

Validar:

Funcionário obrigatório

Projeto obrigatório

Chantier obrigatório

Clock In obrigatório

Clock Out válido

Projeto pertence à empresa

Chantier pertence ao Projeto

Equipe pertence à empresa

Funcionário pertence à empresa

==================================================
APPROVAL
==================================================

Preparar estrutura para aprovação.

Campos:

approved_by

approved_at

status

Ainda não implementar fluxo completo.

==================================================
HISTÓRICO
==================================================

Preparar estrutura para auditoria.

Registrar:

Clock In

Clock Out

Edição

Pausa

Aprovação

Arquivamento

==================================================
TYPESCRIPT
==================================================

Criar ou adaptar:

TimeEntry

TimeEntryForm

TimeEntryDetails

TimeEntryList

TimeEntryStatus

TimeEntryType

TimeEntryFilters

==================================================
SCHEMAS
==================================================

Criar Schemas para:

Create

Update

Clock In

Clock Out

Break

Manual Entry

Search

Filters

Archive

==================================================
DATA LAYER
==================================================

Criar:

listTimeEntries()

getTimeEntry()

createTimeEntry()

updateTimeEntry()

clockIn()

clockOut()

startBreak()

endBreak()

archiveTimeEntry()

restoreTimeEntry()

==================================================
COMPONENTES
==================================================

Criar apenas quando necessário.

Possíveis componentes:

TimeTrackingHeader

TimeTrackingDashboard

TimeEntryTable

TimeEntryCard

TimeEntryForm

ClockInButton

ClockOutButton

BreakButton

TimeEntryDetails

TimeEntryStatusBadge

TimeEntryTypeBadge

SearchBar

Filters

ArchiveDialog

==================================================
ESTADOS
==================================================

Implementar:

Loading

Success

Error

Empty

No Results

Unauthorized

Running

Paused

==================================================
RESPONSIVIDADE
==================================================

Compatível com:

Desktop

Tablet

Mobile

Sem overflow horizontal.

==================================================
ACESSIBILIDADE
==================================================

Garantir:

ARIA

Labels

Keyboard Navigation

Focus

Contraste

==================================================
PERFORMANCE
==================================================

Evitar:

SELECT *

N+1 Queries

Consultas duplicadas

Utilizar:

Paginação

Server Components

Cache existente

Lazy Loading quando necessário

==================================================
PREPARAÇÃO PARA SPRINT 4.3
==================================================

Preparar estrutura para o módulo Timesheets.

Os registros deverão permitir agrupamento por:

Funcionário

Projeto

Chantier

Semana

Mês

Período

Não implementar geração de Timesheets nesta Sprint.

==================================================
OBJETIVO FINAL DESTA PARTE
==================================================

Ao concluir esta Parte 2 deverá existir:

✓ CRUD completo

✓ Dashboard operacional

✓ Clock In

✓ Clock Out

✓ Pausas

✓ Registro Manual

✓ Busca

✓ Filtros

✓ Paginação

✓ Data Layer

✓ Components

✓ Schemas

✓ Types

✓ Cálculo automático das horas

✓ Preparação para Timesheets

Continuar na Parte 3.
###############################################################
# STRATON
# Sprint 4.2 — Time Tracking Engine
# Parte 3/3
###############################################################

==================================================
SEGURANÇA
==================================================

Todo acesso deverá utilizar obrigatoriamente:

- Authentication
- Company Context
- Membership
- Permissions
- Row Level Security (RLS)

Jamais confiar em informações vindas do frontend.

Toda regra deverá ser validada também no servidor.

==================================================
VALIDAÇÕES DE SEGURANÇA
==================================================

Antes de qualquer operação validar:

✓ usuário autenticado

✓ membership ativa

✓ empresa ativa

✓ funcionário pertence à empresa

✓ projeto pertence à empresa

✓ chantier pertence à empresa

✓ equipe pertence à empresa

✓ usuário possui permissão

Caso qualquer validação falhe:

Retornar erro apropriado.

==================================================
ROW LEVEL SECURITY
==================================================

Todas as consultas deverão respeitar:

company_id

Nunca permitir:

SELECT

INSERT

UPDATE

DELETE

entre empresas diferentes.

Criar ou adaptar Policies conforme arquitetura existente.

==================================================
POLÍTICAS
==================================================

SELECT

Usuário visualiza apenas registros da empresa ativa.

INSERT

Permitir criar registros apenas na empresa ativa.

UPDATE

Permitir atualizar apenas registros pertencentes à empresa ativa.

DELETE

Não implementar DELETE físico.

Utilizar apenas Soft Delete.

==================================================
SOFT DELETE
==================================================

Arquivar utilizando:

archived_at

Nunca remover registros permanentemente.

Todas as consultas padrão deverão ignorar registros arquivados.

==================================================
AUDITORIA
==================================================

Registrar eventos importantes.

Exemplos:

Clock In

Clock Out

Pausa iniciada

Pausa encerrada

Registro manual

Registro atualizado

Registro aprovado

Registro rejeitado

Registro arquivado

Registro restaurado

Utilizar sistema de auditoria existente.

==================================================
INTEGRIDADE DOS DADOS
==================================================

Garantir:

company_id imutável

employee_id válido

project_id válido

chantier_id válido

team_id válido

created_at imutável

updated_at automático

approved_at automático

worked_minutes calculado automaticamente

worked_hours calculado automaticamente

==================================================
VALIDAÇÃO DE HORÁRIOS
==================================================

Garantir:

Clock In < Clock Out

Pausa dentro da jornada

Pausa não negativa

Horas trabalhadas positivas

Não permitir:

Clock Out anterior ao Clock In

Pausa superior ao tempo trabalhado

Registros sobrepostos para o mesmo funcionário

==================================================
PROTEÇÃO CONTRA MASS ASSIGNMENT
==================================================

Nunca permitir atualização direta de:

company_id

employee_id

worked_minutes

worked_hours

created_at

updated_at

approved_by

approved_at

Todos esses campos deverão ser controlados pelo backend.

==================================================
PROTEÇÃO DE PARÂMETROS
==================================================

Validar:

entryId

employeeId

projectId

chantierId

teamId

Todos deverão existir.

Todos deverão pertencer à empresa ativa.

==================================================
REGRAS DE CONCORRÊNCIA
==================================================

Garantir que um funcionário não possa possuir:

mais de um Clock In aberto.

Caso exista jornada ativa:

bloquear novo Clock In.

Garantir consistência em acessos simultâneos.

==================================================
PERFORMANCE
==================================================

Evitar:

SELECT *

JOINs desnecessários

N+1 Queries

Duplicação de consultas

Utilizar:

Paginação

Server Components

Cache existente

Lazy Loading quando necessário

Índices para:

company_id

employee_id

project_id

chantier_id

status

clock_in

clock_out

==================================================
RESPONSIVIDADE
==================================================

Compatível com:

Desktop

Tablet

Mobile

Não permitir overflow horizontal.

==================================================
ACESSIBILIDADE
==================================================

Garantir:

Navegação por teclado

ARIA Labels

Focus States

Contraste adequado

Mensagens de erro acessíveis

==================================================
DESIGN SYSTEM
==================================================

Reutilizar componentes existentes.

Utilizar:

Cards

Tables

Dialogs

Forms

Inputs

Dropdowns

Buttons

Badges

Typography

Spacing

Jamais duplicar estilos.

==================================================
STATUS BADGES
==================================================

Criar badges reutilizando o Design System.

Pending

Running

Paused

Finished

Approved

Rejected

Archived

==================================================
ENTRY TYPE BADGES
==================================================

Criar badges para:

Clock In

Manual

Adjustment

Imported

==================================================
TESTES
==================================================

Criar testes para:

CRUD

Clock In

Clock Out

Pausas

Registro Manual

Busca

Filtros

Paginação

Arquivamento

Permissões

RLS

Validação de horários

Cálculo das horas

==================================================
TESTES DE SEGURANÇA
==================================================

Validar:

Usuário Empresa A

não acessa

Empresa B

Funcionário A

não acessa

Funcionário B

Projeto A

não acessa

Projeto B

Chantier A

não acessa

Chantier B

==================================================
TESTES FUNCIONAIS
==================================================

Validar:

Criar registro

Editar registro

Arquivar registro

Clock In

Clock Out

Pausa

Registro Manual

Busca

Filtros

Ordenação

Paginação

Cálculo correto das horas

==================================================
TRATAMENTO DE ERROS
==================================================

Implementar mensagens claras.

Exemplos:

Funcionário não encontrado

Projeto inválido

Chantier inválido

Equipe inválida

Registro inexistente

Clock In já iniciado

Clock Out inválido

Pausa inválida

Permissão negada

Erro inesperado

==================================================
DOCUMENTAÇÃO
==================================================

Atualizar:

docs/sprints/sprint-4.2-time-tracking.md

Documentar:

Arquitetura

Modelo de Dados

Fluxo do Clock In

Fluxo do Clock Out

Fluxo de Pausas

Regras de Negócio

Services

Repositories

Schemas

Server Actions

Componentes

Permissões

RLS

==================================================
PREPARAÇÃO PARA SPRINT 4.3
==================================================

Preparar estrutura para o módulo Timesheets.

Os registros deverão permitir agrupamento por:

Funcionário

Projeto

Chantier

Equipe

Dia

Semana

Mês

Período

Cada Time Entry deverá estar pronto para ser consolidado em um Timesheet.

Não implementar geração de Timesheets nesta Sprint.

==================================================
CRITÉRIOS DE ACEITE
==================================================

A Sprint somente poderá ser considerada concluída quando:

✓ CRUD completo funcionando

✓ Dashboard operacional

✓ Clock In funcionando

✓ Clock Out funcionando

✓ Pausas funcionando

✓ Registro Manual funcionando

✓ Cálculo automático das horas funcionando

✓ Busca funcionando

✓ Filtros funcionando

✓ Paginação funcionando

✓ Integração com Employees funcionando

✓ Integração com Projects funcionando

✓ Integração com Chantiers funcionando

✓ Multi-Tenant funcionando

✓ RLS funcionando

✓ Soft Delete funcionando

✓ Auditoria funcionando

✓ Responsividade validada

✓ Acessibilidade validada

✓ Build sem erros

✓ Lint sem erros

✓ Typecheck sem erros

==================================================
RELATÓRIO FINAL
==================================================

Ao concluir esta Sprint apresentar relatório contendo:

Arquivos criados

Arquivos alterados

Migrations criadas

Policies criadas

Schemas criados

Tipos TypeScript

Services

Repositories

Server Actions

Componentes

Rotas

Permissões

Validações

Integrações

Testes executados

Documentação atualizada

Resultado do Build

Resultado do Lint

Resultado do Typecheck

Estado final do git status

==================================================
RESTRIÇÕES
==================================================

Não alterar funcionalidades das Sprints anteriores.

Não implementar funcionalidades da Sprint 4.3.

Não realizar commit.

Não realizar push.

Não remover funcionalidades existentes.

Sempre reutilizar componentes, serviços e arquitetura já implementados.

==================================================
OBJETIVO FINAL DA SPRINT 4.2
==================================================

Ao término desta Sprint deverá existir um motor de registro de
horas robusto, seguro, escalável e totalmente integrado ao
ecossistema STRATON.

O Time Tracking deverá servir como fonte única da verdade para
todos os registros de jornada, permitindo que os módulos de
Timesheets, Scheduling, GPS, Payroll, Reports e Analytics sejam
implementados sobre uma base consistente e auditável.

Ao finalizar a Sprint:

- interromper a execução;
- validar Build, Lint e Typecheck;
- apresentar o relatório final;
- aguardar a execução da Sprint 4.3 — Timesheets.