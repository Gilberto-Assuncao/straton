# STRATON --- SPRINT 4.1 --- CHANTIERS MANAGEMENT (SPECIFICATION)

Version: 1.0 Status: Uncertain — no matching commit identified in git log as of this consolidation; verify before relying on this Last Updated: 2026-07-21

> This file is the original Sprint specification as issued to an AI coding assistant (in Portuguese, as written). No retrospective/as-built summary has been written yet for this Sprint — treat the content below as the plan, not a confirmed implementation report. Cross-check against `git log` and the actual code before assuming a described capability is live.
>
> **2026-07-21 update:** the "Chantier" entity described throughout this document was renamed to "Site" (table `chantiers`→`sites`, column `chantier_id`→`site_id`, plus a new free-text `reference` field) to support any service segment, not only construction — see `supabase/migrations/202607210001_generalize_chantier_to_site.sql`. This file's original wording is kept as-is for historical accuracy; wherever it says "Chantier", read "Site".

---

Sprint 4.1 — Chantiers Management
###############################################################
# STRATON
# Sprint 4.1 — Chantiers Management
# Parte 1/3
###############################################################

==================================================
OBJETIVO
==================================================

Executar exclusivamente a Sprint 4.1.

Implementar o módulo oficial de gerenciamento de Chantiers
(Construction Sites / Job Sites).

Este módulo representa os locais físicos onde os trabalhos
serão executados.

Cada Chantier pertence obrigatoriamente a um Projeto.

Um Projeto poderá possuir vários Chantiers.

Este módulo será utilizado futuramente por:

- Time Tracking
- GPS
- Geofencing
- Weather
- Scheduling
- Timesheets
- Reports

==================================================
DEPENDÊNCIAS
==================================================

Assumir que já existem completamente implementados:

✓ Authentication

✓ Multi-Tenant

✓ Company Management

✓ Workforce

✓ Teams

✓ Projects

✓ Design System

✓ App Shell

✓ Permissions

✓ RLS

Jamais recriar qualquer uma dessas funcionalidades.

Sempre reutilizar a arquitetura existente.

==================================================
ESCOPO
==================================================

Implementar:

- Chantiers Dashboard

- Chantiers List

- Chantier Details

- Chantier Creation

- Chantier Editing

- Chantier Archive

- Search

- Filters

- Address

- GPS Coordinates

- Local Contacts

- Photos

- Teams

- Status

- Priority

- Project Integration

==================================================
NÃO IMPLEMENTAR
==================================================

Não implementar:

- Check In

- Check Out

- GPS Tracking

- Geofencing

- Weather

- Timesheets

- Payroll

- Financeiro

- Custos

- Mobile

Estas funcionalidades pertencem às próximas Sprints.

==================================================
ROTAS
==================================================

Criar apenas quando necessário.

/dashboard/chantiers

/dashboard/chantiers/new

/dashboard/chantiers/[chantierId]

/dashboard/chantiers/[chantierId]/edit

Todas as rotas deverão utilizar:

- Authentication

- Company Context

- Permissions

- Multi-Tenant

- RLS

==================================================
MODELO CHANTIER
==================================================

Inspecionar o banco antes de criar qualquer migration.

Caso já exista estrutura equivalente:

Adaptar.

Jamais recriar.

Campos previstos:

id

company_id

project_id

code

name

description

status

priority

address

number

postal_code

city

state

country

latitude

longitude

contact_name

contact_phone

contact_email

notes

start_date

estimated_end_date

actual_end_date

created_at

updated_at

archived_at

==================================================
RELAÇÕES
==================================================

Cada Chantier pertence a:

1 Empresa

1 Projeto

Um Projeto poderá possuir:

N Chantiers

Uma Empresa poderá possuir:

N Projetos

N Chantiers

==================================================
PROJECT INTEGRATION
==================================================

Todo Chantier deverá obrigatoriamente pertencer a um Projeto.

Jamais permitir:

Chantier sem Projeto.

Caso o Projeto seja arquivado:

O Chantier deverá permanecer preservado para histórico.

==================================================
COMPANY INTEGRATION
==================================================

Todo Chantier pertence à empresa ativa.

Nunca permitir:

- acesso cruzado

- alteração manual do company_id

- visualização entre empresas

Todas as consultas deverão utilizar:

empresa ativa

membership válida

RLS

==================================================
STATUS
==================================================

Implementar:

Planning

Ready

Active

Paused

Completed

Cancelled

Archived

Utilizar Badge reutilizando o Design System.

==================================================
PRIORIDADE
==================================================

Low

Medium

High

Critical

Utilizar Badge reutilizando o componente existente.

==================================================
ENDEREÇO
==================================================

Criar endereço estruturado.

Campos:

Street

Number

Postal Code

City

State

Country

Jamais utilizar endereço único em texto livre.

==================================================
COORDENADAS
==================================================

Preparar estrutura para GPS.

Campos:

latitude

longitude

Ainda não implementar:

Mapas

Geofencing

Tracking

==================================================
FOTOS
==================================================

Preparar suporte para fotografias da obra.

Implementar apenas:

Upload

Listagem

Remoção

Não implementar:

Galeria avançada

Compressão inteligente

IA

==================================================
CONTATOS
==================================================

Cada Chantier poderá possuir:

Responsável Local

Telefone

Email

Observações

Não implementar CRM.

==================================================
TEAMS
==================================================

Permitir vincular:

uma ou várias equipes.

Preparar estrutura para:

Scheduling

Time Tracking

==================================================
PERMISSÕES
==================================================

Reutilizar integralmente o sistema existente.

Owner

Acesso total.

Admin

CRUD completo.

Manager

CRUD conforme política existente.

Supervisor

Visualização e atualização operacional.

Employee

Somente leitura autorizada.

Contractor

Somente leitura autorizada.

Viewer

Somente leitura.

Todas as permissões deverão ser validadas:

Servidor

Banco

RLS

Jamais confiar apenas na interface.

==================================================
MULTI-TENANT
==================================================

Todos os Chantiers pertencem a exatamente uma Empresa.

Todos os Projetos pertencem a exatamente uma Empresa.

Jamais permitir:

empresa A acessar Chantier da empresa B.

Todas as consultas deverão utilizar:

Company Context

Membership

Permissions

RLS

==================================================
OBJETIVO FINAL DESTA PARTE
==================================================

Ao concluir esta Parte 1 deverá existir toda a estrutura conceitual do módulo Chantiers, incluindo:

- arquitetura;
- entidades;
- relacionamentos;
- regras de negócio;
- rotas;
- integrações com Projects;
- integração com Companies;
- integração com Teams;
- modelo de dados;
- status;
- prioridades;
- preparação para GPS e Time Tracking.

Não implementar funcionalidades da Sprint 4.2 nesta etapa.

Continuar na Parte 2.
###############################################################
# STRATON
# Sprint 4.1 — Chantiers Management
# Parte 2/3
###############################################################

==================================================
IMPLEMENTAÇÃO
==================================================

Implementar o módulo Chantiers seguindo integralmente
a arquitetura existente.

Reutilizar:

- Components
- Services
- Repositories
- Hooks
- Schemas
- Server Actions
- Permissions
- UI Components
- Tables
- Forms

Jamais criar arquitetura paralela.

==================================================
CRUD
==================================================

Implementar:

Create Chantier

Read Chantier

Update Chantier

Archive Chantier

Não implementar DELETE físico.

Utilizar Soft Delete.

==================================================
DASHBOARD
==================================================

Criar Dashboard operacional.

Exibir:

Total de Obras

Obras Ativas

Em Planejamento

Pausadas

Concluídas

Canceladas

Arquivadas

Atrasadas

Obras iniciando hoje

Obras encerrando esta semana

==================================================
LISTA
==================================================

Criar listagem principal.

Exibir:

Código

Nome

Projeto

Cidade

Status

Prioridade

Equipes

Responsável

Data Inicial

Data Prevista

Última Atualização

Ações

==================================================
DETALHES
==================================================

Criar tela completa.

Exibir:

Resumo

Projeto

Empresa

Endereço

Mapa (placeholder)

Fotos

Contato

Equipe

Datas

Status

Prioridade

Observações

==================================================
CRIAÇÃO
==================================================

Criar formulário completo.

Campos:

Nome

Código

Projeto

Descrição

Status

Prioridade

Rua

Número

CEP

Cidade

Estado

País

Latitude

Longitude

Contato

Telefone

Email

Data Inicial

Data Final Prevista

Observações

Equipes

==================================================
EDIÇÃO
==================================================

Permitir editar:

Nome

Descrição

Status

Prioridade

Endereço

Contato

Datas

Fotos

Equipes

Jamais permitir alteração manual de:

company_id

project_id sem validação

created_at

==================================================
BUSCA
==================================================

Implementar busca por:

Nome

Código

Projeto

Cidade

Rua

Contato

Telefone

Email

==================================================
FILTROS
==================================================

Criar filtros:

Projeto

Cidade

Status

Prioridade

Equipe

Arquivados

Ativos

==================================================
ORDENAÇÃO
==================================================

Permitir ordenar por:

Nome

Código

Cidade

Status

Prioridade

Projeto

Data Inicial

Data Prevista

Atualização

==================================================
PAGINAÇÃO
==================================================

Utilizar paginação existente.

Jamais carregar todos os registros.

==================================================
FOTOS
==================================================

Implementar:

Upload

Visualização

Remoção

Preparar estrutura para:

Cloud Storage

Supabase Storage

S3

Não implementar compressão.

==================================================
ENDEREÇO
==================================================

Separar completamente os campos.

Não utilizar endereço em texto único.

Preparar para integração futura com mapas.

==================================================
COORDENADAS
==================================================

Permitir informar:

Latitude

Longitude

Validar formato.

Não implementar:

Google Maps

OpenStreetMap

Leaflet

Mapbox

==================================================
EQUIPES
==================================================

Permitir:

Adicionar equipes

Remover equipes

Listar equipes

Validar:

Empresa

Permissões

==================================================
CONTATOS
==================================================

Permitir:

Nome

Telefone

Email

Cargo

Observações

Não implementar múltiplos contatos.

==================================================
STATUS
==================================================

Permitir alteração controlada.

Planning

↓

Ready

↓

Active

↓

Paused

↓

Active

↓

Completed

↓

Archived

Também permitir:

Cancelled

↓

Archived

==================================================
ARQUIVAMENTO
==================================================

Implementar:

Archive

Restore (opcional)

Jamais excluir registros.

==================================================
VALIDAÇÕES
==================================================

Validar:

Projeto obrigatório

Nome obrigatório

Empresa válida

Latitude válida

Longitude válida

Email válido

Telefone

Datas

Equipe pertence à empresa

Projeto pertence à empresa

==================================================
TYPESCRIPT
==================================================

Criar ou adaptar:

Chantier

ChantierForm

ChantierDetails

ChantierList

ChantierStatus

ChantierPriority

ChantierAddress

ChantierContact

==================================================
SCHEMAS
==================================================

Criar Schemas para:

Create

Update

Archive

Filters

Search

==================================================
DATA LAYER
==================================================

Criar:

listChantiers

getChantier

createChantier

updateChantier

archiveChantier

restoreChantier

==================================================
COMPONENTES
==================================================

Criar somente quando necessário.

Possíveis componentes:

ChantiersHeader

ChantiersDashboard

ChantiersTable

ChantierCard

ChantierForm

ChantierDetails

AddressCard

ContactCard

PhotosCard

TeamsCard

StatusBadge

PriorityBadge

SearchBar

Filters

ArchiveDialog

==================================================
ESTADOS
==================================================

Implementar:

Loading

Empty

Error

Success

No Results

Unauthorized

==================================================
RESPONSIVIDADE
==================================================

Desktop

Tablet

Mobile

Sem overflow horizontal.

==================================================
ACESSIBILIDADE
==================================================

Labels

ARIA

Teclado

Contraste

Foco

==================================================
PERFORMANCE
==================================================

Evitar:

SELECT *

N+1 Queries

Duplicação de consultas

Utilizar:

Paginação

Cache existente

Server Components

==================================================
PREPARAÇÃO PARA SPRINT 4.2
==================================================

Preparar estrutura para:

Time Tracking

Cada apontamento deverá possuir:

project_id

chantier_id

Não implementar registro de horas nesta Sprint.

==================================================
OBJETIVO FINAL DESTA PARTE
==================================================

Ao concluir esta Parte 2 deverá existir:

✓ CRUD completo

✓ Dashboard

✓ Listagem

✓ Busca

✓ Filtros

✓ Fotos

✓ Endereço estruturado

✓ Coordenadas

✓ Equipes

✓ Contato

✓ Componentes

✓ Data Layer

✓ Schemas

✓ Types

✓ Preparação para Time Tracking

Continuar na Parte 3.
###############################################################
# STRATON
# Sprint 4.1 — Chantiers Management
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

Jamais confiar em qualquer informação enviada pelo frontend.

Toda validação deverá acontecer também no servidor.

==================================================
VALIDAÇÕES DE SEGURANÇA
==================================================

Antes de qualquer operação validar:

✓ usuário autenticado

✓ membership ativa

✓ empresa ativa

✓ projeto pertence à empresa

✓ chantier pertence à empresa

✓ equipes pertencem à empresa

✓ usuário possui permissão

Caso qualquer validação falhe:

Retornar erro apropriado.

==================================================
ROW LEVEL SECURITY
==================================================

Todas as consultas deverão respeitar:

company_id

Jamais permitir:

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

Usuário visualiza apenas Chantiers da empresa ativa.

INSERT

Permitir apenas criar Chantiers para a empresa ativa.

UPDATE

Permitir atualização apenas de registros da empresa ativa.

DELETE

Não implementar DELETE físico.

Utilizar apenas Soft Delete.

==================================================
SOFT DELETE
==================================================

Arquivar utilizando:

archived_at

Jamais remover registros permanentemente.

Todas as consultas padrão deverão ignorar registros arquivados.

==================================================
AUDITORIA
==================================================

Registrar operações importantes.

Exemplos:

Chantier criado

Chantier atualizado

Status alterado

Prioridade alterada

Equipe vinculada

Equipe removida

Fotos adicionadas

Fotos removidas

Arquivamento

Restauração

Utilizar sistema de auditoria existente.

==================================================
INTEGRIDADE DOS DADOS
==================================================

Validar:

project_id obrigatório

company_id imutável

created_at imutável

updated_at automático

archived_at automático

Latitude válida

Longitude válida

Datas consistentes

==================================================
VALIDAÇÃO DE DATAS
==================================================

Garantir:

Data Inicial

<=

Data Prevista

<=

Data Final

Quando aplicável.

Jamais permitir datas inconsistentes.

==================================================
PROTEÇÃO CONTRA MASS ASSIGNMENT
==================================================

Nunca aceitar atualização livre do objeto.

Atualizar apenas campos permitidos.

Ignorar:

company_id

created_at

updated_at

archived_at

==================================================
PROTEÇÃO DE PARÂMETROS
==================================================

Validar:

chantierId

projectId

teamId

companyId

Todos deverão existir.

Todos deverão pertencer à empresa ativa.

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

Lazy Loading quando aplicável

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

Reutilizar todos os componentes existentes.

Jamais criar estilos duplicados.

Utilizar:

Cards

Tables

Buttons

Inputs

Dialogs

Badges

Dropdowns

Modals

Typography

Spacing

==================================================
STATUS BADGES
==================================================

Criar badges reutilizando componentes existentes.

Planning

Ready

Active

Paused

Completed

Cancelled

Archived

==================================================
PRIORITY BADGES
==================================================

Criar badges:

Low

Medium

High

Critical

==================================================
TESTES
==================================================

Criar testes para:

CRUD

Permissões

RLS

Filtros

Busca

Paginação

Arquivamento

Validação de Projeto

Validação de Empresa

Validação de Equipes

==================================================
TESTES DE SEGURANÇA
==================================================

Validar:

Usuário Empresa A

não pode acessar

Empresa B

Projeto A

não acessa

Projeto B

Equipe A

não acessa

Equipe B

==================================================
TESTES FUNCIONAIS
==================================================

Validar:

Criar Chantier

Editar

Arquivar

Pesquisar

Filtrar

Ordenar

Adicionar Fotos

Editar Endereço

Editar Contato

Adicionar Equipes

==================================================
TRATAMENTO DE ERROS
==================================================

Implementar mensagens claras.

Exemplos:

Projeto não encontrado

Empresa inválida

Permissão negada

Equipe inválida

Chantier inexistente

Status inválido

Erro inesperado

==================================================
DOCUMENTAÇÃO
==================================================

Atualizar:

docs/sprints/sprint-4.1-chantiers.md

Documentar:

Arquitetura

Modelo de Dados

Relacionamentos

Fluxo

Componentes

Services

Repositories

Schemas

Server Actions

Rotas

Permissões

RLS

==================================================
PREPARAÇÃO PARA SPRINT 4.2
==================================================

Preparar estrutura para o módulo:

Time Tracking

Cada registro de horas deverá utilizar:

company_id

project_id

chantier_id

employee_id

Não implementar Time Tracking nesta Sprint.

Garantir que toda a arquitetura esteja pronta para integração.

==================================================
CRITÉRIOS DE ACEITE
==================================================

A Sprint somente poderá ser considerada concluída quando:

✓ CRUD completo funcionando

✓ Dashboard operacional

✓ Listagem operacional

✓ Busca funcionando

✓ Filtros funcionando

✓ Paginação funcionando

✓ Upload de Fotos funcionando

✓ Endereço estruturado implementado

✓ Coordenadas implementadas

✓ Contato implementado

✓ Integração com Projetos funcionando

✓ Integração com Equipes funcionando

✓ Multi-Tenant funcionando

✓ RLS funcionando

✓ Soft Delete funcionando

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

Não implementar funcionalidades da Sprint 4.2.

Não realizar commit.

Não realizar push.

Não remover funcionalidades existentes.

Sempre reutilizar componentes e arquitetura já implementados.

==================================================
OBJETIVO FINAL DA SPRINT 4.1
==================================================

Ao término desta Sprint deverá existir um módulo completo de
gerenciamento de Chantiers, totalmente integrado ao ecossistema
STRATON.

O módulo deverá permitir que empresas gerenciem seus locais de
trabalho de forma organizada, segura e escalável, servindo como
base para os módulos de Time Tracking, Scheduling, GPS,
Geofencing, Weather, Timesheets e Analytics que serão
implementados nas próximas Sprints.

Ao finalizar, interromper a execução e aguardar a próxima Sprint
(4.2 — Time Tracking Engine).