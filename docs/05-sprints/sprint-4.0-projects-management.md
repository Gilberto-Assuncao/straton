# STRATON --- SPRINT 4.0 --- PROJECTS MANAGEMENT (SPECIFICATION)

Version: 1.0 Status: Completed per git log (`feat: add projects and clients module`), documentation-only gap Last Updated: 2026-07-21

> This file is the original Sprint specification as issued to an AI coding assistant (in Portuguese, as written). No retrospective/as-built summary has been written yet for this Sprint — treat the content below as the plan, not a confirmed implementation report. Cross-check against `git log` and the actual code before assuming a described capability is live.

---

Trabalhe no repositório:

Gilberto-Assuncao/straton

Branch:

main

SPRINT ATUAL

Sprint 4.0 — Projects Management

Identifique claramente esta execução como Sprint 4.0 em:

- relatório inicial;
- documentação da sprint;
- roadmap;
- relatório final.

==================================================
CONTEXTO
==================================================

As etapas anteriores já implementaram:

- Design System
- App Shell
- Authentication
- Multi-Tenant Foundation
- Workforce Foundation
- Company Management
- Teams
- Documentação oficial

Todo o trabalho existente deve ser preservado.

Não recriar:

- autenticação;
- Company Switcher;
- Workforce;
- Company Management;
- Teams;
- componentes compartilhados;
- Design System;
- App Shell;
- sistema de permissões;
- sistema de navegação.

Não faça commit.

Não faça push.

==================================================
1. VERIFICAÇÕES INICIAIS
==================================================

Antes de modificar qualquer arquivo:

Execute:

git status

git branch --show-current

git log -5 --oneline

git remote -v

Confirme:

- branch atual;
- working tree;
- últimos commits;
- sincronização com origin/main.

Caso a branch esteja atrás do remoto:

Executar apenas:

git pull --ff-only origin main

Somente se:

- não existirem alterações locais.

Caso contrário:

não executar pull.

==================================================
2. INSPEÇÃO DA ARQUITETURA
==================================================

Antes de implementar qualquer funcionalidade:

Inspecionar cuidadosamente:

- package.json
- app/
- src/
- components/
- features/
- hooks/
- lib/
- services/
- repositories/
- types/
- docs/
- supabase/
- migrations/
- proxy.ts
- middleware
- autenticação
- Company Context
- Company Switcher
- Workforce
- Teams
- Design System

Confirmar:

- convenções existentes;
- padrões de nomenclatura;
- estrutura de pastas;
- organização de componentes;
- estrutura de rotas;
- padrão de formulários;
- padrão de tabelas;
- padrão de modais;
- padrão visual.

Jamais criar uma arquitetura paralela.

==================================================
3. OBJETIVO
==================================================

Executar:

Sprint 4.0 — Projects Management

Criar o módulo oficial de Projetos do STRATON.

Este módulo será o núcleo operacional da plataforma.

Todo trabalho executado por equipes será vinculado a um Projeto.

No futuro os módulos:

- Chantiers
- Time Tracking
- Timesheets
- GPS
- Weather
- Reports

utilizarão Projects como referência principal.

==================================================
4. ESCOPO
==================================================

Implementar:

- Projects Dashboard

- Projects List

- Project Details

- Project Creation

- Project Editing

- Project Status

- Project Priority

- Client Information

- Team Assignment

- Project Manager

- Archive Project

- Search

- Filters

- Company Integration

- Team Integration

- Multi-Tenant

- Documentation

==================================================
5. NÃO IMPLEMENTAR
==================================================

Esta sprint NÃO deve implementar:

- Chantiers

- GPS

- Geofencing

- Weather

- Timesheets

- Time Tracking

- Payroll

- Custos

- Financeiro

- Billing

- Marketplace

- Mobile

Essas funcionalidades pertencem às próximas sprints.

==================================================
6. ROTAS
==================================================

Seguir a arquitetura existente.

Criar apenas quando necessário:

/dashboard/projects

/dashboard/projects/new

/dashboard/projects/[projectId]

/dashboard/projects/[projectId]/edit

Não criar rotas duplicadas.

Toda rota deverá:

- utilizar o App Shell;

- utilizar autenticação;

- utilizar empresa ativa;

- validar permissões;

- utilizar RLS.

==================================================
7. MODELO PROJECT
==================================================

Inspecionar o banco antes de criar qualquer migration.

Caso já exista tabela de projetos:

Adaptar.

Não recriar.

Campos previstos:

id

company_id

code

name

description

client_name

project_manager_membership_id

status

priority

start_date

estimated_end_date

actual_end_date

budget

currency

created_at

updated_at

archived_at

Os nomes podem ser adaptados ao padrão existente.

==================================================
8. STATUS
==================================================

Criar ou adaptar:

Draft

Planning

Active

On Hold

Completed

Cancelled

Archived

Não excluir projetos definitivamente.

Arquivamento apenas por soft delete.

==================================================
9. PRIORIDADE
==================================================

Criar:

Low

Medium

High

Critical

Utilizar Badge visual reutilizando o Design System.

==================================================
10. MULTI-TENANT
==================================================

Todo Projeto pertence obrigatoriamente a uma empresa.

Nunca permitir:

- acesso cruzado;

- alteração de company_id;

- visualização de projetos de outra empresa;

- manipulação por URL.

Toda consulta deve utilizar:

empresa ativa

membership válida

RLS

==================================================
11. PERMISSÕES
==================================================

Reutilizar o sistema existente.

Regras mínimas:

Owner

- acesso total.

Admin

- criar
- editar
- arquivar

Manager

- criar
- editar

Supervisor

- visualizar
- atualizar andamento quando permitido

Employee

- somente leitura dos projetos autorizados

Contractor

- leitura limitada quando autorizado

Viewer

- somente leitura.

Jamais confiar apenas na interface.

Todas as validações devem existir:

- servidor

- banco

- RLS

==================================================
12. COMPANY INTEGRATION
==================================================

Todo Projeto deverá:

pertencer à empresa ativa.

A empresa deverá possuir:

múltiplos projetos.

Não criar nova estrutura Company.

Reutilizar Company existente.

==================================================
13. TEAM INTEGRATION
==================================================

Um Projeto poderá possuir:

uma ou várias equipes.

Uma equipe poderá participar de vários projetos.

Preparar estrutura para:

Project Team Assignment.

Não implementar alocação avançada nesta sprint.

==================================================
14. PROJECT MANAGER
==================================================

Cada Projeto poderá possuir:

um responsável principal.

O responsável deverá:

pertencer à empresa;

possuir Company Membership válida;

ser selecionado entre funcionários existentes.

Não criar tabela paralela de responsáveis.

==================================================
15. CLIENT INFORMATION
==================================================

Nesta sprint armazenar apenas informações básicas:

Nome

Empresa

Telefone

E-mail

Observações

Não implementar CRM.

Não implementar cadastro completo de clientes.

Preparar para futura integração.

==================================================
16. ESTRATÉGIA DE IMPLEMENTAÇÃO
==================================================

Implementar o módulo Projects de forma incremental.

Antes de criar arquivos:

- procurar estruturas equivalentes existentes;
- reutilizar componentes compartilhados;
- reutilizar helpers;
- reutilizar schemas;
- reutilizar services;
- reutilizar padrões de Server Actions ou API Routes;
- reutilizar tratamento de erros;
- reutilizar feedback visual;
- reutilizar autorização existente.

Evitar:

- duplicação de componentes;
- lógica de negócio em componentes visuais;
- consultas diretamente espalhadas pelas páginas;
- tipagens genéricas desnecessárias;
- uso indiscriminado de `any`;
- dependências novas sem justificativa;
- abstrações prematuras.

O módulo deve permanecer:

- simples;
- modular;
- testável;
- seguro;
- escalável;
- compatível com as próximas sprints operacionais.

==================================================
17. DATA LAYER
==================================================

Seguir o padrão de acesso a dados já utilizado no projeto.

Caso exista estrutura baseada em:

- repositories;
- services;
- queries;
- actions;
- server functions;
- Supabase clients;
- typed database helpers;

reutilizar essa estrutura.

Criar funções equivalentes apenas quando necessário.

Operações mínimas previstas:

- listProjects
- getProjectById
- createProject
- updateProject
- archiveProject
- restoreProject, apenas se coerente com a arquitetura atual
- listProjectTeams
- assignTeamsToProject
- removeTeamFromProject
- getProjectSummary
- getProjectFiltersData

Os nomes devem respeitar as convenções existentes.

Não expor ao cliente:

- service role key;
- credenciais privadas;
- consultas administrativas;
- dados de outras empresas;
- detalhes internos de autorização.

==================================================
18. TIPOS TYPESCRIPT
==================================================

Criar ou adaptar tipos para:

Project

ProjectStatus

ProjectPriority

ProjectFormValues

ProjectListItem

ProjectDetails

ProjectSummary

ProjectFilters

ProjectTeamAssignment

ProjectClientInformation

Não duplicar tipos gerados pelo banco.

Quando existirem tipos gerados pelo Supabase:

- reutilizar;
- derivar com Pick;
- derivar com Omit;
- derivar com Partial;
- criar tipos de view model somente quando necessário.

Evitar:

- interfaces excessivamente amplas;
- objetos sem tipagem;
- casts inseguros;
- tipos divergentes entre formulário, servidor e banco.

==================================================
19. SCHEMAS E VALIDAÇÃO
==================================================

Utilizar a biblioteca de validação já existente.

Caso o projeto use Zod:

criar ou adaptar schemas para:

- criação de projeto;
- edição de projeto;
- filtros;
- parâmetros de rota;
- atribuição de equipes;
- arquivamento;
- restauração, se implementada.

Validações mínimas:

name

- obrigatório;
- remover espaços excedentes;
- tamanho mínimo razoável;
- tamanho máximo seguro.

code

- opcional ou obrigatório conforme padrão definido;
- único dentro da empresa;
- normalizado;
- não permitir valores vazios compostos apenas por espaços.

description

- opcional;
- tamanho máximo seguro.

client_name

- opcional;
- tamanho máximo seguro.

client_company

- opcional;
- tamanho máximo seguro.

client_email

- opcional;
- validar formato quando informado.

client_phone

- opcional;
- tamanho máximo seguro.

status

- aceitar apenas valores oficiais.

priority

- aceitar apenas valores oficiais.

start_date

- opcional ou obrigatório conforme decisão existente.

estimated_end_date

- não pode ser anterior à data inicial.

actual_end_date

- somente aplicável quando coerente com o status;
- não pode ser anterior à data inicial.

budget

- opcional;
- não negativo;
- utilizar precisão adequada;
- não tratar valores monetários com arredondamento inseguro.

currency

- usar valor suportado;
- preferencialmente EUR como padrão inicial;
- não limitar estruturalmente o sistema apenas a EUR.

project_manager_membership_id

- deve pertencer à empresa ativa;
- deve possuir membership válida;
- não aceitar membership externa.

team_ids

- todas as equipes devem pertencer à empresa ativa;
- remover duplicatas;
- rejeitar IDs inválidos.

==================================================
20. REGRAS DE NEGÓCIO DO PROJETO
==================================================

Aplicar as seguintes regras:

1. Todo projeto pertence a exatamente uma empresa.

2. O company_id deve ser definido no servidor com base na empresa ativa.

3. O usuário nunca deve fornecer company_id livremente pelo formulário.

4. O código do projeto deve ser único por empresa, quando utilizado.

5. Projetos arquivados não aparecem na visualização padrão.

6. Projetos arquivados devem continuar acessíveis quando o filtro de arquivados estiver ativo.

7. Projetos arquivados não podem receber novas alterações operacionais sem restauração, salvo necessidade administrativa claramente prevista.

8. O arquivamento deve preencher archived_at.

9. O arquivamento não deve apagar:

- equipes;
- responsável;
- histórico;
- referências;
- dados relacionados.

10. Um projeto concluído pode permanecer visível.

11. Completed e Archived são conceitos diferentes.

12. Cancelled e Archived são conceitos diferentes.

13. O responsável principal deve pertencer à mesma empresa.

14. Equipes atribuídas devem pertencer à mesma empresa.

15. Um projeto não deve depender da existência de uma equipe para ser criado.

16. Um projeto pode ser criado sem responsável principal.

17. Alterações de status devem respeitar transições coerentes.

==================================================
21. TRANSIÇÕES DE STATUS
==================================================

Definir uma política simples e documentada.

Fluxo recomendado:

Draft
→ Planning
→ Active
→ On Hold
→ Active
→ Completed

Também permitir, mediante permissão:

Draft
→ Cancelled

Planning
→ Cancelled

Active
→ Cancelled

On Hold
→ Cancelled

Completed
→ Archived

Cancelled
→ Archived

Qualquer status
→ Archived

somente para papéis autorizados e por meio da ação específica de arquivamento.

Evitar que Archived seja tratado como simples status editável no formulário.

O arquivamento deve possuir uma ação própria.

Não criar uma máquina de estados excessivamente complexa nesta sprint.

==================================================
22. CÓDIGO DO PROJETO
==================================================

Implementar o campo `code` de acordo com a arquitetura existente.

Caso não exista regra anterior:

utilizar uma abordagem simples.

Exemplo visual:

PRJ-0001

O código deve ser:

- exclusivo dentro da empresa;
- legível;
- estável;
- não dependente do nome do projeto;
- não reutilizado após arquivamento.

Caso a geração automática exija risco de concorrência:

implementar de forma segura no banco.

Não gerar código somente no navegador.

Não utilizar:

- contagem simples de registros no cliente;
- número aleatório sem controle;
- timestamp como código visível;
- UUID completo como código de interface.

Caso a geração automática não seja segura dentro do escopo:

permitir código manual validado e documentar a decisão.

==================================================
23. CRIAÇÃO DE PROJETO
==================================================

Criar a experiência de criação em:

/dashboard/projects/new

O formulário deve incluir, conforme aplicável:

Informações principais:

- nome;
- código;
- descrição;
- status inicial;
- prioridade.

Planejamento:

- data inicial;
- data estimada de conclusão;
- orçamento;
- moeda.

Cliente:

- nome do contato;
- empresa;
- telefone;
- e-mail;
- observações.

Responsabilidade:

- project manager;
- equipes iniciais.

Comportamento:

- validar no cliente para experiência;
- validar novamente no servidor;
- impedir envio duplicado;
- mostrar estado de carregamento;
- mostrar erros de campo;
- mostrar erro geral quando necessário;
- preservar dados do formulário em caso de falha;
- redirecionar para detalhes após sucesso;
- exibir feedback de sucesso.

O status padrão recomendado é:

Draft

A prioridade padrão recomendada é:

Medium

Não definir datas automaticamente sem necessidade.

==================================================
24. EDIÇÃO DE PROJETO
==================================================

Criar a experiência de edição em:

/dashboard/projects/[projectId]/edit

A página deve:

- carregar o projeto validando empresa ativa;
- verificar permissão;
- preencher os dados existentes;
- impedir alteração do company_id;
- impedir alteração direta do archived_at;
- impedir alteração direta para Archived;
- validar responsável;
- validar equipes;
- validar datas;
- registrar updated_at;
- retornar feedback adequado.

Caso o projeto não exista ou não pertença à empresa:

usar o comportamento seguro já adotado no projeto.

Não revelar:

- que o projeto existe em outra empresa;
- IDs internos;
- detalhes de autorização;
- dados de outro tenant.

==================================================
25. ARQUIVAMENTO
==================================================

Criar ação específica para arquivar projeto.

A ação deve:

- exigir permissão adequada;
- validar empresa ativa;
- validar membership;
- localizar o projeto no tenant atual;
- solicitar confirmação;
- preencher archived_at;
- preservar os dados;
- impedir duplicidade;
- atualizar a interface.

A confirmação deve explicar que:

- o projeto sairá das listas padrão;
- os dados não serão apagados;
- o projeto poderá permanecer disponível em filtros de arquivados;
- referências históricas serão preservadas.

Não utilizar confirmação nativa simples do navegador quando o Design System já possuir Dialog ou AlertDialog.

Preferir componente reutilizável.

==================================================
26. RESTAURAÇÃO
==================================================

A restauração é opcional nesta sprint.

Implementar somente se:

- a arquitetura existente suportar naturalmente;
- não ampliar excessivamente o escopo;
- as permissões estiverem claras;
- a experiência de arquivados estiver implementada.

Quando implementada:

- limpar archived_at;
- exigir Owner ou Admin;
- manter o status anterior quando possível;
- caso o status anterior não esteja disponível, restaurar como Draft;
- documentar a decisão.

Não implementar restauração parcial ou histórica complexa.

==================================================
27. LISTA DE PROJETOS
==================================================

Criar a página principal em:

/dashboard/projects

A lista deve ser útil para operação diária.

Exibir, no mínimo:

- código;
- nome;
- cliente;
- status;
- prioridade;
- responsável;
- equipes;
- data inicial;
- data prevista;
- última atualização;
- ações permitidas.

Em telas menores:

reduzir colunas e priorizar:

- nome;
- código;
- status;
- prioridade;
- responsável.

A lista pode utilizar:

- tabela;
- cards;
- visualização adaptativa;
- padrão já existente no sistema.

Não criar uma tabela incompatível com mobile.

==================================================
28. BUSCA
==================================================

Implementar busca por:

- nome;
- código;
- cliente;
- empresa do cliente;
- responsável, quando viável;
- nome de equipe, quando viável.

A busca deve:

- respeitar a empresa ativa;
- respeitar projetos arquivados conforme filtro;
- possuir debounce quando executada no cliente;
- evitar consultas excessivas;
- preservar filtros na URL quando o padrão do projeto utilizar query params;
- aceitar estado vazio;
- possuir opção de limpar.

Preferir busca no servidor quando a quantidade de dados puder crescer.

Não carregar todos os projetos no cliente apenas para filtrar localmente.

==================================================
29. FILTROS
==================================================

Implementar filtros para:

- status;
- prioridade;
- project manager;
- equipe;
- período;
- ativos;
- arquivados;
- todos, quando autorizado.

Filtros devem:

- poder ser combinados;
- ter ação de limpar;
- mostrar valores ativos;
- funcionar com paginação;
- respeitar a URL quando o padrão existente suportar;
- não permitir valores arbitrários;
- validar parâmetros recebidos.

O filtro padrão deve excluir projetos arquivados.

==================================================
30. ORDENAÇÃO
==================================================

Implementar ordenação conforme padrão existente.

Opções recomendadas:

- mais recentes;
- atualizados recentemente;
- nome A–Z;
- código;
- prioridade;
- data inicial;
- prazo estimado.

A ordenação deve ocorrer no servidor quando possível.

Definir uma ordenação padrão previsível.

Sugestão:

updated_at decrescente.

==================================================
31. PAGINAÇÃO
==================================================

Implementar paginação quando a arquitetura existente já possuir padrão.

A paginação deve:

- ocorrer no servidor;
- respeitar busca;
- respeitar filtros;
- respeitar ordenação;
- preservar query params;
- evitar carregar grandes volumes;
- apresentar total quando viável.

Caso o projeto utilize cursor pagination:

seguir o padrão existente.

Caso utilize offset pagination:

aplicar limite razoável.

Não inventar uma segunda estratégia de paginação.

==================================================
32. ESTADOS DA LISTA
==================================================

A lista deve possuir estados claros:

Loading

- skeleton ou padrão existente.

Empty

- quando não há projetos cadastrados;
- apresentar CTA de criação para quem possui permissão.

No Results

- quando busca ou filtros não retornam resultados;
- permitir limpar busca e filtros.

Error

- mensagem amigável;
- opção de tentar novamente quando aplicável;
- não expor detalhes técnicos.

Success

- dados renderizados corretamente.

Unauthorized

- seguir comportamento global do sistema.

==================================================
33. PROJECTS DASHBOARD
==================================================

Na página principal de Projects, criar um resumo operacional simples.

Exibir cards ou indicadores para:

- total de projetos ativos;
- em planejamento;
- em espera;
- concluídos;
- atrasados, quando possível calcular;
- projetos críticos;
- projetos atualizados recentemente.

O dashboard deve:

- respeitar empresa ativa;
- respeitar permissões;
- utilizar consultas eficientes;
- possuir estados de loading;
- possuir estados vazios;
- evitar cálculos duplicados no cliente.

Não implementar analytics avançado.

Não implementar gráficos complexos nesta sprint.

Não implementar custos e lucratividade.

==================================================
34. DEFINIÇÃO DE PROJETO ATRASADO
==================================================

Um projeto pode ser marcado visualmente como atrasado quando:

- estimated_end_date existe;
- estimated_end_date é anterior à data atual;
- status não é Completed;
- status não é Cancelled;
- projeto não está arquivado.

Esta marcação é derivada.

Não é necessário criar uma coluna `is_overdue`.

Utilizar helper ou view model.

Garantir consistência de timezone.

==================================================
35. DETALHES DO PROJETO
==================================================

Criar página em:

/dashboard/projects/[projectId]

Exibir:

Cabeçalho:

- código;
- nome;
- status;
- prioridade;
- ações.

Resumo:

- descrição;
- responsável;
- equipes;
- datas;
- orçamento;
- moeda;
- cliente;
- atualização.

Seções preparatórias:

- visão geral;
- equipes;
- atividade recente, apenas se houver suporte existente;
- espaços reservados elegantes para módulos futuros, somente quando úteis.

Não criar abas vazias excessivas.

Não criar funcionalidades falsas.

Caso um módulo futuro ainda não exista:

exibir texto discreto como:

“Disponível em uma próxima etapa”

apenas quando necessário.

==================================================
36. AÇÕES NA PÁGINA DE DETALHES
==================================================

Conforme a permissão, oferecer:

- editar projeto;
- arquivar projeto;
- restaurar projeto, se implementado;
- voltar para lista;
- alterar status por fluxo controlado, quando aplicável.

Não exibir ações que o usuário não pode executar.

Mesmo assim:

todas as ações devem validar permissão no servidor.

==================================================
37. TEAM ASSIGNMENT
==================================================

Implementar atribuição básica de equipes ao projeto.

A relação deve suportar:

- vários projetos por equipe;
- várias equipes por projeto.

Antes de criar tabela intermediária:

verificar se já existe estrutura equivalente.

Nome possível:

project_teams

Campos previstos:

id ou chave composta

company_id, apenas se coerente com o padrão

project_id

team_id

assigned_at

assigned_by

created_at

Aplicar constraints para:

- evitar duplicidade;
- garantir integridade;
- impedir referências inválidas;
- melhorar performance.

Todas as equipes selecionadas devem pertencer à empresa ativa.

==================================================
38. EXPERIÊNCIA DE SELEÇÃO DE EQUIPES
==================================================

Utilizar o componente existente mais adequado:

- multi-select;
- combobox;
- command;
- checkbox list;
- modal de seleção.

A seleção deve:

- listar somente equipes da empresa ativa;
- mostrar nome;
- mostrar status da equipe, quando existente;
- impedir duplicatas;
- permitir remover;
- funcionar por teclado;
- possuir loading;
- possuir estado vazio;
- possuir busca, quando houver muitas equipes.

Não criar um componente complexo se o projeto já possuir solução compartilhada.

==================================================
39. PROJECT MANAGER SELECTION
==================================================

O campo de responsável deve listar memberships elegíveis.

Mostrar, conforme dados disponíveis:

- nome;
- e-mail;
- função;
- cargo;
- status.

Filtrar:

- memberships ativas;
- membros da empresa ativa;
- perfis autorizados conforme regra existente.

Não permitir seleção de:

- membro removido;
- convite pendente sem perfil válido;
- usuário de outra empresa;
- membership inativa.

A ausência de responsável deve ser permitida.

==================================================
40. CLIENT INFORMATION UI
==================================================

Agrupar as informações de cliente em uma seção clara.

Campos:

- nome do contato;
- nome da empresa;
- e-mail;
- telefone;
- observações.

Não criar:

- tabela de clientes completa;
- histórico comercial;
- pipeline;
- contatos múltiplos;
- CRM;
- faturamento.

Essas informações pertencem ao projeto nesta sprint.

==================================================
41. ORÇAMENTO E MOEDA
==================================================

O orçamento é apenas informativo nesta sprint.

Não implementar:

- controle financeiro;
- faturas;
- pagamentos;
- custos reais;
- margem;
- lucratividade;
- conversão cambial.

Exibir o orçamento usando formatação monetária adequada.

Armazenar de forma segura no banco.

Preferir:

numeric/decimal

Evitar:

float impreciso.

A moeda padrão pode ser EUR.

O código deve permanecer preparado para outras moedas.

==================================================
42. COMPONENTES
==================================================

Criar somente os componentes necessários.

Possíveis componentes:

ProjectsHeader

ProjectsSummaryCards

ProjectsFilters

ProjectsSearch

ProjectsTable

ProjectsList

ProjectCard

ProjectStatusBadge

ProjectPriorityBadge

ProjectForm

ProjectFormSection

ProjectDetailsHeader

ProjectOverview

ProjectClientCard

ProjectTeamsCard

ProjectManagerField

ProjectTeamsField

ArchiveProjectDialog

ProjectEmptyState

ProjectListSkeleton

Os nomes devem seguir as convenções atuais.

Não criar todos automaticamente.

Criar apenas quando houver reutilização ou ganho real de organização.

==================================================
43. SERVER COMPONENTS E CLIENT COMPONENTS
==================================================

Utilizar Server Components por padrão.

Usar Client Components apenas quando necessário para:

- formulário interativo;
- seleção;
- diálogo;
- busca com interação;
- filtros;
- feedback;
- controle de estado.

Não marcar páginas inteiras como client sem necessidade.

Manter:

- consultas no servidor;
- segredos no servidor;
- autorização no servidor;
- componentes visuais simples no servidor quando possível.

==================================================
44. FORMULÁRIOS
==================================================

Seguir o padrão já adotado no STRATON.

O formulário deve possuir:

- labels visíveis;
- descrições quando úteis;
- mensagens de erro próximas aos campos;
- associação correta com aria-describedby;
- foco no primeiro erro quando possível;
- estado de envio;
- prevenção de duplo clique;
- feedback após sucesso;
- feedback após erro.

Não utilizar placeholders como substitutos de labels.

Separar o formulário em seções visuais sem prejudicar a navegação.

==================================================
45. SERVER ACTIONS OU API
==================================================

Seguir a estratégia já existente.

Caso o projeto utilize Server Actions:

- validar input;
- resolver usuário;
- resolver empresa ativa;
- resolver membership;
- verificar permissão;
- executar operação;
- tratar erro;
- revalidar cache;
- redirecionar ou retornar resultado tipado.

Caso utilize Route Handlers:

- aplicar as mesmas validações;
- utilizar métodos HTTP adequados;
- retornar códigos coerentes;
- evitar exposição de detalhes internos.

Não misturar duas estratégias sem necessidade.

==================================================
46. CACHE E REVALIDAÇÃO
==================================================

Após criação:

- revalidar lista de projetos;
- revalidar dashboard;
- revalidar rotas relacionadas;
- redirecionar para detalhes.

Após edição:

- revalidar detalhes;
- revalidar lista;
- revalidar dashboard.

Após arquivamento:

- revalidar lista;
- revalidar detalhes;
- revalidar dashboard.

Após atribuição de equipes:

- revalidar detalhes;
- revalidar edição;
- revalidar consultas relacionadas.

Seguir o mecanismo de cache existente.

Evitar:

- cache global de dados multi-tenant sem chave;
- dados de uma empresa aparecendo para outra;
- revalidação excessiva de toda a aplicação.

==================================================
47. TRATAMENTO DE ERROS
==================================================

Criar tratamento consistente para:

- projeto não encontrado;
- acesso negado;
- empresa ativa ausente;
- membership inválida;
- responsável inválido;
- equipe inválida;
- código duplicado;
- falha de banco;
- erro de validação;
- conflito de atualização;
- sessão expirada.

Mensagens para o usuário devem ser:

- claras;
- profissionais;
- não técnicas;
- acionáveis quando possível.

Logs internos podem conter contexto técnico seguro.

Nunca registrar:

- tokens;
- cookies;
- senhas;
- chaves;
- dados pessoais desnecessários;
- payloads completos sensíveis.

==================================================
48. CONCORRÊNCIA E INTEGRIDADE
==================================================

Proteger contra:

- código duplicado;
- atribuição duplicada de equipe;
- edição de projeto arquivado;
- alteração concorrente destrutiva;
- referências a memberships removidas;
- referências a equipes removidas;
- acesso por ID manipulado.

Utilizar:

- constraints;
- foreign keys;
- índices;
- transações, quando necessárias;
- validação no servidor;
- RLS.

Não confiar apenas em verificações prévias da interface.

==================================================
49. ÍNDICES
==================================================

Avaliar índices para:

projects.company_id

projects.status

projects.priority

projects.archived_at

projects.updated_at

projects.code

projects.project_manager_membership_id

project_teams.project_id

project_teams.team_id

Criar somente os índices necessários.

Para código único por empresa:

considerar constraint ou índice único composto.

Exemplo conceitual:

(company_id, code)

Quando code for opcional:

adaptar a constraint à tecnologia utilizada.

==================================================
50. MIGRATIONS
==================================================

Caso sejam necessárias migrations:

- seguir o padrão de nomenclatura existente;
- criar apenas migrations incrementais;
- não editar migrations já aplicadas;
- não apagar tabelas existentes;
- não recriar estruturas desnecessariamente;
- adicionar comentários quando úteis;
- incluir rollback apenas se o padrão do projeto utilizar;
- manter compatibilidade com dados existentes.

Antes de criar migration:

inspecionar todas as migrations relacionadas a:

- companies;
- memberships;
- teams;
- profiles;
- users;
- projects, se já existir;
- RLS;
- enums.

==================================================
51. ENUMS
==================================================

Antes de criar enums no banco:

verificar o padrão atual.

Caso o projeto utilize:

- PostgreSQL enums;
- check constraints;
- tabelas de referência;
- strings tipadas;

seguir o padrão existente.

Não criar enums incompatíveis.

Status previstos:

draft
planning
active
on_hold
completed
cancelled

Archived deve preferencialmente ser representado por archived_at.

Prioridades previstas:

low
medium
high
critical

A interface pode apresentar traduções amigáveis.

==================================================
52. UI STATES DAS AÇÕES
==================================================

Todas as ações devem possuir:

Idle

Loading

Success

Error

Disabled

Quando necessário:

Confirming

O botão de salvar deve:

- ficar desabilitado durante envio;
- evitar múltiplas submissões;
- indicar processamento.

O botão de arquivar deve:

- utilizar estilo destrutivo;
- exigir confirmação;
- permanecer inacessível para usuários sem permissão.

==================================================
53. FEEDBACK VISUAL
==================================================

Utilizar o padrão existente para:

- toast;
- alert;
- inline error;
- success message;
- dialog.

Mensagens sugeridas:

Criação:

“Projeto criado com sucesso.”

Edição:

“Projeto atualizado com sucesso.”

Arquivamento:

“Projeto arquivado com sucesso.”

Erro genérico:

“Não foi possível concluir esta ação. Tente novamente.”

Não utilizar mensagens contraditórias.

Não mostrar sucesso antes da confirmação do servidor.

==================================================
54. LOCALIZAÇÃO E TEXTOS
==================================================

Seguir a estratégia de idioma existente.

Não codificar textos em um idioma diferente do padrão do projeto sem integração adequada.

Preparar labels para futura internacionalização, caso o sistema ainda não possua i18n completa.

Termos de interface recomendados em português:

Projetos

Novo projeto

Detalhes do projeto

Editar projeto

Arquivar projeto

Responsável

Equipes

Cliente

Data de início

Previsão de conclusão

Orçamento

Status

Prioridade

Não traduzir valores persistidos no banco.

Persistir valores técnicos estáveis.

Traduzir apenas na interface.

==================================================
55. PREPARAÇÃO PARA SPRINT 4.1
==================================================

A Sprint 4.1 implementará Chantiers.

Preparar Projects para que:

- um projeto possa futuramente possuir vários chantiers;
- Project Details possa receber seção de chantiers;
- referências sejam estáveis;
- não seja necessário alterar o identificador do projeto;
- o projeto permaneça como entidade operacional principal.

Não criar tabela de chantiers nesta sprint.

Não criar campos temporários de chantier dentro de projects.

Não misturar endereço de projeto com endereço futuro de chantier sem necessidade.

==================================================
56. PREPARAÇÃO PARA SPRINT 4.2
==================================================

A Sprint 4.2 implementará Time Tracking.

Preparar Projects para que:

- registros de horas possam apontar para project_id;
- projetos arquivados preservem registros históricos;
- projetos ativos possam ser selecionados em apontamentos;
- projetos concluídos possam continuar visíveis em relatórios;
- permissões possam limitar projetos disponíveis ao funcionário.

Não implementar apontamento de horas agora.

==================================================
57. PREPARAÇÃO PARA SPRINT 4.3
==================================================

A Sprint 4.3 implementará Timesheets.

Garantir que:

- project_id seja estável;
- projeto possua nome e código legíveis;
- projetos arquivados não sejam apagados;
- relatórios futuros consigam recuperar informações históricas;
- status do projeto não destrua relações existentes.

Não implementar timesheets nesta sprint.

==================================================
58. PREPARAÇÃO PARA SPRINT 4.4
==================================================

A Sprint 4.4 implementará Scheduling.

Garantir que:

- equipes possam estar relacionadas a projetos;
- responsável esteja associado por membership;
- datas do projeto sejam tipadas corretamente;
- projetos ativos possam ser utilizados como filtro futuro;
- projetos arquivados não apareçam em novas alocações.

Não implementar calendário agora.

==================================================
59. PREPARAÇÃO PARA SPRINT 4.6
==================================================

A Sprint 4.6 implementará GPS e Geofencing.

Não adicionar coordenadas ao Project apenas por antecipação.

As coordenadas devem pertencer aos futuros Chantiers.

Projects deve permanecer como entidade administrativa e operacional.

Não misturar:

- projeto;
- local físico;
- chantier;
- ponto de trabalho.

==================================================
60. RESULTADO ESPERADO DESTA PARTE
==================================================

Ao concluir os itens desta Parte 2, o módulo deverá possuir:

- camada de dados estruturada;
- tipagem consistente;
- validação completa;
- regras de negócio claras;
- criação de projetos;
- edição de projetos;
- arquivamento seguro;
- listagem;
- busca;
- filtros;
- ordenação;
- paginação, quando aplicável;
- dashboard resumido;
- detalhes do projeto;
- integração básica com equipes;
- seleção de responsável;
- estados de interface;
- tratamento de erros;
- preparação para as próximas sprints.

Não encerrar a Sprint 4.0 após esta parte.

Continuar com a Parte 3, que definirá:

- RLS;
- políticas de banco;
- segurança;
- permissões detalhadas;
- acessibilidade;
- responsividade;
- Design System;
- testes;
- qualidade;
- documentação;
- critérios de aceite;
- relatório final obrigatório.
==================================================
61. SEGURANÇA GERAL
==================================================

A implementação deve seguir segurança por padrão.

Garantir:

- autenticação obrigatória;
- empresa ativa válida;
- membership válida;
- autorização por papel;
- validação no servidor;
- RLS no banco;
- isolamento multi-tenant;
- proteção contra IDs manipulados;
- proteção contra mass assignment;
- proteção contra exposição de dados;
- mensagens de erro seguras.

Nunca confiar em:

- dados vindos do navegador;
- company_id enviado pelo cliente;
- role enviada pelo cliente;
- project_id sem validação;
- team_id sem validação;
- membership_id sem validação;
- permissões apenas visuais;
- filtros aplicados somente na interface.

==================================================
62. RESOLUÇÃO DA EMPRESA ATIVA
==================================================

Toda operação deve resolver a empresa ativa utilizando o mecanismo oficial já existente.

Não criar:

- novo cookie;
- novo localStorage;
- novo contexto paralelo;
- novo header customizado;
- nova forma de selecionar empresa.

A empresa ativa deve ser obtida por meio da infraestrutura existente.

Caso não exista empresa ativa:

- bloquear a ação;
- redirecionar conforme padrão atual;
- exibir estado apropriado;
- não executar consulta sem escopo de tenant.

==================================================
63. RESOLUÇÃO DA MEMBERSHIP
==================================================

Antes de qualquer operação protegida:

1. Resolver usuário autenticado.

2. Resolver empresa ativa.

3. Localizar a membership do usuário nessa empresa.

4. Confirmar que a membership está válida e ativa.

5. Verificar o papel e as permissões.

6. Somente então executar a operação.

Não aceitar membership_id do navegador como fonte de autoridade.

Quando um membership_id for utilizado como responsável:

- validar que pertence à empresa ativa;
- validar que está ativo;
- validar que pode assumir o papel;
- impedir associação cruzada.

==================================================
64. MATRIZ DE PERMISSÕES
==================================================

Reutilizar o sistema oficial de permissões.

Caso já exista RBAC ou permission helpers:

não recriar.

Aplicar, no mínimo, a seguinte matriz conceitual:

Owner

- listar todos os projetos da empresa;
- visualizar detalhes;
- criar;
- editar;
- alterar status;
- atribuir equipes;
- definir responsável;
- arquivar;
- restaurar, se implementado.

Admin

- listar todos os projetos;
- visualizar detalhes;
- criar;
- editar;
- alterar status;
- atribuir equipes;
- definir responsável;
- arquivar;
- restaurar, se permitido pela política atual.

Manager

- listar projetos autorizados ou da empresa, conforme regra existente;
- visualizar detalhes;
- criar;
- editar;
- alterar status;
- atribuir equipes quando autorizado;
- definir responsável quando autorizado;
- não restaurar projeto arquivado, salvo regra explícita.

Supervisor

- visualizar projetos autorizados;
- visualizar equipes relacionadas;
- atualizar andamento ou status limitado quando permitido;
- não arquivar;
- não alterar informações administrativas sensíveis.

Employee

- visualizar apenas projetos aos quais possui acesso;
- não criar;
- não editar;
- não arquivar;
- não atribuir equipes.

Contractor

- visualizar somente projetos explicitamente autorizados;
- acesso limitado aos dados necessários;
- não visualizar orçamento quando a política da empresa restringir;
- não alterar projeto.

Viewer

- somente leitura;
- sem ações de alteração.

A matriz final deve respeitar as permissões já definidas no sistema.

Não codificar regras conflitantes com sprints anteriores.

==================================================
65. AUTORIZAÇÃO POR PROJETO
==================================================

Além do papel geral, preparar o módulo para autorização por projeto.

Para perfis administrativos:

o acesso pode abranger todos os projetos da empresa.

Para perfis operacionais:

o acesso pode depender de:

- equipe atribuída;
- responsabilidade direta;
- associação futura;
- permissão explícita existente.

Nesta sprint:

não criar um sistema complexo de ACL por projeto.

Utilizar as relações já disponíveis.

Garantir que Employee e Contractor não obtenham automaticamente acesso a todos os projetos da empresa caso a política atual seja restritiva.

Documentar claramente a decisão aplicada.

==================================================
66. ROW LEVEL SECURITY
==================================================

Todas as tabelas novas ou adaptadas relacionadas a Projects devem possuir RLS habilitada quando o projeto utiliza Supabase/PostgreSQL com RLS.

Verificar:

- projects;
- project_teams;
- tabelas auxiliares;
- views;
- funções SQL;
- policies existentes.

Não assumir que RLS está ativa.

Confirmar explicitamente.

As policies devem impedir acesso entre empresas mesmo quando:

- o usuário conhece o UUID;
- altera parâmetros da URL;
- altera payloads;
- chama diretamente a API;
- tenta inserir company_id de outro tenant;
- tenta associar equipe externa;
- tenta definir responsável externo.

==================================================
67. POLÍTICA DE SELECT EM PROJECTS
==================================================

A policy de leitura deve permitir acesso somente quando:

- o usuário está autenticado;
- possui membership válida na empresa do projeto;
- possui permissão de leitura;
- atende a eventuais restrições operacionais.

Para Owner e Admin:

permitir leitura dos projetos da empresa ativa ou da empresa vinculada à membership validada.

Para Manager:

seguir a regra de acesso já definida.

Para Supervisor, Employee, Contractor e Viewer:

limitar conforme relações autorizadas.

Não utilizar apenas:

auth.uid() IS NOT NULL

como policy suficiente.

==================================================
68. POLÍTICA DE INSERT EM PROJECTS
==================================================

A policy de criação deve exigir:

- usuário autenticado;
- membership ativa;
- papel autorizado;
- company_id correspondente à empresa da membership;
- dados válidos.

O company_id inserido deve corresponder ao tenant autorizado.

Preferir que o servidor defina company_id.

Mesmo assim:

a policy deve impedir company_id externo.

Não permitir criação por:

- Employee;
- Contractor;
- Viewer;
- memberships suspensas;
- memberships removidas;
- usuários sem empresa válida.

==================================================
69. POLÍTICA DE UPDATE EM PROJECTS
==================================================

A policy de atualização deve:

- validar membership;
- validar papel;
- validar empresa;
- impedir mudança de company_id;
- impedir acesso a projeto de outro tenant;
- impedir edição de projeto arquivado quando aplicável;
- respeitar regras de papel.

Avaliar uso de:

- WITH CHECK;
- comparação entre dados antigos e novos;
- função helper segura;
- trigger para campos imutáveis.

Não confiar apenas na Server Action.

==================================================
70. POLÍTICA DE DELETE EM PROJECTS
==================================================

Não permitir DELETE físico de projetos pela aplicação.

A policy de DELETE deve:

- não existir para usuários comuns;
- ou negar explicitamente;
- ou permanecer restrita a manutenção administrativa fora da aplicação.

O arquivamento deve ocorrer via UPDATE de archived_at.

Não implementar botão de exclusão permanente.

==================================================
71. POLÍTICAS DE PROJECT_TEAMS
==================================================

A tabela de relacionamento entre projetos e equipes deve possuir RLS coerente.

SELECT:

- permitir somente quando projeto e equipe pertencem à empresa autorizada;
- respeitar acesso do usuário ao projeto.

INSERT:

- exigir papel autorizado;
- garantir project_id da empresa;
- garantir team_id da mesma empresa;
- impedir associação cruzada.

DELETE:

- permitir remoção da atribuição apenas a papéis autorizados;
- validar tenant;
- preservar histórico quando a arquitetura exigir.

UPDATE:

- evitar quando a relação puder ser removida e recriada;
- não permitir alteração que troque tenant.

==================================================
72. FUNÇÕES SQL E SECURITY DEFINER
==================================================

Caso seja necessário criar funções SQL:

- preferir funções simples;
- definir search_path de forma segura;
- evitar SQL dinâmico;
- validar auth.uid();
- validar membership;
- validar empresa;
- retornar somente dados necessários.

Ao utilizar SECURITY DEFINER:

- justificar;
- restringir execução;
- proteger search_path;
- não contornar RLS sem necessidade;
- documentar a razão.

Não criar função privilegiada para resolver conveniência de aplicação.

==================================================
73. CAMPOS IMUTÁVEIS
==================================================

Os seguintes campos devem ser tratados como imutáveis ou controlados:

id

- nunca alterável.

company_id

- nunca alterável após criação.

created_at

- nunca alterável pelo cliente.

created_by, se existir

- nunca alterável.

archived_at

- alterável apenas por ação oficial de arquivamento/restauração.

code

- avaliar se pode ser editado;
- caso seja editável, preservar unicidade;
- evitar alteração após uso operacional, se isso comprometer histórico.

A decisão sobre edição do código deve ser documentada.

==================================================
74. AUDITORIA
==================================================

Verificar se o projeto já possui mecanismo de auditoria.

Caso exista:

integrar ações de Projects.

Registrar, conforme padrão existente:

- criação;
- edição;
- mudança de status;
- atribuição de equipe;
- remoção de equipe;
- alteração de responsável;
- arquivamento;
- restauração.

Não criar sistema paralelo de auditoria.

Caso não exista auditoria:

não implementar uma solução completa nesta sprint.

No mínimo, preservar:

- created_at;
- updated_at;
- archived_at;
- created_by, se o padrão atual utilizar;
- updated_by, se o padrão atual utilizar.

Documentar a limitação.

==================================================
75. LOGS
==================================================

Logs internos devem possuir contexto útil.

Exemplos:

- operação;
- identificador seguro;
- empresa;
- usuário;
- tipo do erro.

Não registrar:

- token;
- cookie;
- senha;
- chave privada;
- service role key;
- payload completo;
- telefone completo sem necessidade;
- e-mail completo sem necessidade;
- observações do cliente;
- dados pessoais sensíveis.

Utilizar o sistema de logging existente.

Não utilizar console.log indiscriminadamente em produção.

==================================================
76. PROTEÇÃO CONTRA MASS ASSIGNMENT
==================================================

Ao criar ou atualizar projetos:

não enviar o objeto completo do formulário diretamente ao banco.

Mapear explicitamente campos permitidos.

Na criação, aceitar somente campos autorizados, como:

- name;
- code;
- description;
- client_name;
- client_company;
- client_email;
- client_phone;
- client_notes;
- project_manager_membership_id;
- status;
- priority;
- start_date;
- estimated_end_date;
- budget;
- currency.

Definir no servidor:

- company_id;
- created_at;
- created_by;
- updated_at;
- archived_at inicial;
- campos de auditoria.

Na edição:

não aceitar alteração de campos protegidos.

==================================================
77. PROTEÇÃO DE PARÂMETROS DE ROTA
==================================================

Validar projectId recebido por rota.

Garantir:

- formato correto;
- consulta limitada ao tenant;
- resposta segura para ID inválido;
- resposta segura para projeto inexistente;
- resposta segura para projeto de outra empresa.

Não consultar primeiro por ID global e depois verificar empresa.

Preferir consulta já escopada por:

- project_id;
- company_id;
- acesso autorizado.

==================================================
78. PROTEÇÃO CONTRA ENUMERAÇÃO
==================================================

Não revelar diferenças entre:

- projeto inexistente;
- projeto existente em outra empresa;
- projeto sem permissão;
- ID inválido.

Seguir o padrão de resposta segura do projeto.

Quando apropriado:

usar estado “não encontrado” para impedir enumeração.

Logs internos podem diferenciar os casos.

A interface pública não deve expor detalhes.

==================================================
79. CSRF E AÇÕES MUTÁVEIS
==================================================

Seguir as proteções da arquitetura atual.

Caso utilize Server Actions do Next.js:

manter ações restritas ao servidor e validar sessão.

Caso utilize Route Handlers:

- validar origem quando necessário;
- utilizar cookies seguros;
- aplicar métodos HTTP corretos;
- rejeitar métodos inesperados;
- não permitir mutações por GET.

Não criar endpoints mutáveis sem autenticação.

==================================================
80. RATE LIMITING
==================================================

Não é obrigatório criar infraestrutura completa de rate limiting nesta sprint.

Entretanto:

- evitar ações repetidas;
- desabilitar botões durante envio;
- proteger geração automática de código;
- evitar consultas excessivas na busca;
- utilizar debounce;
- aplicar limites de paginação.

Caso já exista rate limiting:

integrar endpoints de criação e atualização conforme padrão.

==================================================
81. ACESSIBILIDADE
==================================================

Toda interface deve atender boas práticas de acessibilidade.

Garantir:

- navegação por teclado;
- foco visível;
- labels associadas;
- contraste adequado;
- headings hierárquicos;
- landmarks;
- mensagens de erro acessíveis;
- diálogos com foco controlado;
- botões com nomes claros;
- ícones com texto ou aria-label;
- tabelas com cabeçalhos;
- badges não dependentes apenas de cor.

Não utilizar somente cor para indicar:

- status;
- prioridade;
- atraso;
- erro;
- sucesso.

==================================================
82. ACESSIBILIDADE DOS FORMULÁRIOS
==================================================

Cada campo deve possuir:

- label;
- id;
- name;
- descrição quando necessária;
- mensagem de erro;
- aria-invalid;
- aria-describedby.

Erros devem ser anunciáveis por tecnologias assistivas.

Ao falhar a submissão:

- manter os dados;
- focar o primeiro campo inválido quando possível;
- fornecer resumo do erro se o padrão existente possuir.

Campos obrigatórios devem ser identificados claramente.

==================================================
83. ACESSIBILIDADE DOS DIÁLOGOS
==================================================

O diálogo de arquivamento deve:

- possuir título;
- possuir descrição;
- prender foco;
- permitir fechar por teclado;
- restaurar foco ao elemento de origem;
- destacar ação destrutiva;
- possuir botão cancelar;
- evitar fechamento acidental durante submissão.

Reutilizar componente acessível do Design System.

==================================================
84. ACESSIBILIDADE DA TABELA
==================================================

Caso seja utilizada tabela:

- incluir caption visualmente oculta quando necessário;
- usar th corretamente;
- indicar ordenação;
- permitir foco nas ações;
- evitar ações apenas por hover;
- garantir leitura lógica;
- fornecer alternativa responsiva.

Em mobile:

não transformar a tabela em conteúdo ilegível.

Utilizar cards ou layout condensado quando necessário.

==================================================
85. RESPONSIVIDADE
==================================================

O módulo deve funcionar em:

- desktop;
- laptop;
- tablet;
- smartphone.

Testar larguras aproximadas:

- 1440px;
- 1280px;
- 1024px;
- 768px;
- 390px;
- 360px.

Garantir:

- sem overflow horizontal indevido;
- botões acessíveis;
- filtros utilizáveis;
- formulário legível;
- cards adaptáveis;
- tabela responsiva;
- diálogos adequados;
- cabeçalhos sem quebra problemática.

==================================================
86. LAYOUT MOBILE
==================================================

Em mobile:

- manter CTA principal visível;
- permitir busca;
- recolher filtros em drawer, popover ou painel apropriado;
- priorizar informações essenciais;
- evitar múltiplas colunas estreitas;
- empilhar seções do formulário;
- manter ações com área de toque adequada;
- utilizar menu de ações quando necessário.

Não esconder funcionalidades críticas.

Não exigir hover.

==================================================
87. DESIGN SYSTEM
==================================================

Reutilizar integralmente o Design System existente.

Utilizar componentes oficiais para:

- Button;
- Input;
- Textarea;
- Select;
- Badge;
- Card;
- Table;
- Dialog;
- AlertDialog;
- Dropdown;
- Tabs, se realmente necessário;
- Skeleton;
- Empty State;
- Toast;
- Form controls.

Não criar estilos isolados que contradigam:

- cores;
- espaçamentos;
- radius;
- tipografia;
- sombras;
- estados de foco;
- estados de hover;
- layout.

==================================================
88. IDENTIDADE VISUAL STRATON
==================================================

Preservar a identidade visual definida:

- Poppins;
- fundo escuro premium;
- verde principal;
- superfícies escuras;
- bordas discretas;
- texto claro;
- hierarquia visual limpa;
- aparência SaaS profissional.

Não introduzir:

- novas paletas;
- gradientes excessivos;
- cores aleatórias para status;
- ícones inconsistentes;
- visual genérico desconectado do App Shell.

==================================================
89. BADGES DE STATUS
==================================================

Criar mapeamento visual consistente.

Exemplo conceitual:

Draft

- neutro.

Planning

- informativo.

Active

- positivo.

On Hold

- atenção.

Completed

- sucesso discreto.

Cancelled

- destrutivo ou neutro crítico.

Archived

- muted.

As cores devem respeitar o Design System.

Sempre incluir texto.

==================================================
90. BADGES DE PRIORIDADE
==================================================

Mapeamento conceitual:

Low

- muted.

Medium

- informativo ou padrão.

High

- atenção.

Critical

- destrutivo.

Não depender somente da cor.

Opcionalmente utilizar ícone discreto, se já houver padrão.

==================================================
91. ESTADO DE ATRASO
==================================================

Projetos atrasados devem possuir indicação visual clara.

Exibir:

- texto “Atrasado”;
- badge;
- ícone acessível;
- data prevista.

Não utilizar apenas texto vermelho.

A condição deve ser derivada conforme regra da Parte 2.

==================================================
92. PERFORMANCE
==================================================

Evitar:

- N+1 queries;
- carregamento de todos os projetos;
- carregamento de todas as memberships sem necessidade;
- carregamento de todas as equipes sem paginação ou filtro;
- múltiplas consultas duplicadas;
- re-renderizações desnecessárias;
- Client Components excessivos;
- bundles grandes;
- imports pesados.

Preferir:

- consultas agregadas;
- joins controlados;
- selects explícitos;
- paginação;
- Server Components;
- streaming ou suspense, se já utilizado;
- cache escopado corretamente.

==================================================
93. CONSULTAS
==================================================

Toda consulta deve selecionar somente os campos necessários.

Evitar:

SELECT *

quando não for necessário.

Na lista:

carregar dados resumidos.

Nos detalhes:

carregar dados completos autorizados.

Nos selects:

carregar somente:

- id;
- nome;
- status;
- informações mínimas.

Não enviar observações de cliente para telas que não precisam delas.

==================================================
94. DADOS RELACIONADOS
==================================================

Ao consultar responsável e equipes:

- evitar consultas separadas por projeto;
- utilizar joins ou consultas em lote;
- manter tipagem;
- limitar dados;
- respeitar RLS.

Não retornar perfis completos quando somente nome e ID são necessários.

==================================================
95. TESTES
==================================================

Inspecionar a estratégia de testes existente.

Reutilizar:

- framework;
- estrutura;
- mocks;
- helpers;
- convenções;
- scripts.

Não instalar novo framework sem necessidade.

Criar testes proporcionais ao escopo.

==================================================
96. TESTES UNITÁRIOS
==================================================

Cobrir, quando aplicável:

- validação de formulário;
- normalização de código;
- cálculo de atraso;
- formatação de status;
- formatação de prioridade;
- transições de status;
- regras de datas;
- filtros;
- mapeamento de payload;
- proteção de campos imutáveis.

Evitar testes frágeis de implementação interna.

==================================================
97. TESTES DE INTEGRAÇÃO
==================================================

Cobrir fluxos críticos:

- criação de projeto;
- edição;
- arquivamento;
- listagem por empresa;
- filtro de arquivados;
- código duplicado;
- responsável externo;
- equipe externa;
- permissão insuficiente;
- projeto de outro tenant;
- projeto inexistente.

Caso testes de banco estejam disponíveis:

validar RLS.

==================================================
98. TESTES DE RLS
==================================================

Quando a infraestrutura permitir, testar:

1. Usuário da Empresa A não lê projeto da Empresa B.

2. Usuário da Empresa A não edita projeto da Empresa B.

3. Usuário da Empresa A não arquiva projeto da Empresa B.

4. Usuário não associa equipe da Empresa B.

5. Usuário não define responsável da Empresa B.

6. Employee não cria projeto.

7. Viewer não edita projeto.

8. Admin da empresa pode criar projeto.

9. DELETE físico é bloqueado.

10. Projeto arquivado permanece isolado por tenant.

==================================================
99. TESTES DE INTERFACE
==================================================

Quando o projeto possuir testes de interface:

cobrir:

- renderização da lista;
- estado vazio;
- busca;
- filtros;
- formulário;
- erros;
- loading;
- confirmação de arquivamento;
- permissões visuais;
- responsividade básica;
- navegação por teclado.

Não criar snapshots excessivos.

==================================================
100. TESTES MANUAIS OBRIGATÓRIOS
==================================================

Executar manualmente:

1. Login com Owner.

2. Seleção de empresa.

3. Abertura de Projects.

4. Criação de projeto.

5. Validação de campos obrigatórios.

6. Validação de data final anterior à inicial.

7. Validação de e-mail inválido.

8. Seleção de responsável.

9. Seleção de múltiplas equipes.

10. Abertura dos detalhes.

11. Edição.

12. Mudança de status.

13. Arquivamento.

14. Filtro de arquivados.

15. Busca por nome.

16. Busca por código.

17. Filtro por status.

18. Filtro por prioridade.

19. Teste com Employee.

20. Teste com Viewer.

21. Tentativa de acessar ID de outra empresa.

22. Teste em mobile.

23. Teste por teclado.

24. Teste de estado vazio.

25. Teste de erro de banco simulado, quando viável.

==================================================
101. QUALIDADE DE CÓDIGO
==================================================

Manter:

- TypeScript estrito;
- funções pequenas;
- nomes claros;
- separação de responsabilidades;
- ausência de duplicação;
- componentes focados;
- validação centralizada;
- autorização centralizada;
- consultas reutilizáveis;
- comentários apenas quando agregam valor.

Evitar:

- arquivos gigantes;
- componentes monolíticos;
- lógica de banco em JSX;
- lógica de autorização duplicada;
- condições complexas inline;
- casts desnecessários;
- any;
- @ts-ignore;
- eslint-disable sem justificativa.

==================================================
102. DEPENDÊNCIAS
==================================================

Não instalar dependências novas sem necessidade real.

Antes de instalar:

- verificar package.json;
- verificar se já existe solução;
- avaliar impacto;
- avaliar manutenção;
- avaliar bundle;
- avaliar compatibilidade com Next.js.

Caso uma dependência seja indispensável:

documentar:

- nome;
- versão;
- objetivo;
- justificativa.

Não atualizar dependências não relacionadas.

==================================================
103. COMPATIBILIDADE
==================================================

Preservar compatibilidade com:

- versão atual do Next.js;
- App Router;
- TypeScript;
- Supabase;
- Design System;
- autenticação;
- multi-tenant;
- App Shell;
- middleware ou proxy existente;
- scripts atuais;
- deploy atual.

Não realizar upgrades gerais nesta sprint.

==================================================
104. DOCUMENTAÇÃO DA SPRINT
==================================================

Criar ou atualizar documentação seguindo o padrão existente.

Documento sugerido:

docs/sprints/sprint-4.0-projects-management.md

Adaptar o caminho ao padrão real do repositório.

A documentação deve conter:

- título;
- objetivo;
- escopo;
- itens implementados;
- itens não implementados;
- arquitetura;
- modelo de dados;
- rotas;
- permissões;
- RLS;
- regras de negócio;
- componentes;
- testes;
- decisões;
- limitações;
- preparação para próximas sprints.

==================================================
105. DOCUMENTAÇÃO DO MODELO DE DADOS
==================================================

Registrar:

Projects

- finalidade;
- campos;
- constraints;
- índices;
- relações;
- soft delete;
- status;
- prioridade.

Project Teams

- finalidade;
- relações;
- unicidade;
- RLS.

Project Manager

- relação com membership;
- regras de validade;
- comportamento quando membro é removido.

Não documentar estruturas que não foram implementadas.

==================================================
106. ADR
==================================================

Criar ADR somente se houver decisão arquitetural relevante e permanente.

Exemplos:

- estratégia de código de projeto;
- representação de Archived por archived_at;
- relação many-to-many com Teams;
- relação do responsável por membership;
- estratégia de autorização operacional.

Não criar ADR para decisões triviais.

Seguir o padrão de ADR existente.

==================================================
107. ROADMAP
==================================================

Atualizar o roadmap oficial do STRATON.

Marcar:

Sprint 4.0 — Projects Management

como concluída somente após:

- implementação completa;
- testes;
- documentação;
- validações;
- build;
- lint;
- typecheck;
- revisão final.

Manter visíveis as próximas sprints:

- 4.1 Chantiers;
- 4.2 Time Tracking;
- 4.3 Timesheets;
- 4.4 Scheduling;
- 4.5 Leave;
- 4.6 GPS;
- 4.7 Weather;
- 4.8 Reports;
- 4.9 Costs & Profitability.

==================================================
108. README
==================================================

Atualizar README somente se necessário.

Incluir Projects na lista de funcionalidades caso exista seção apropriada.

Não transformar README em relatório de sprint.

Não adicionar detalhes internos excessivos.

==================================================
109. VARIÁVEIS DE AMBIENTE
==================================================

Não criar novas variáveis de ambiente sem necessidade.

Não incluir valores reais em:

- código;
- documentação;
- migrations;
- exemplos;
- logs.

Caso nenhuma nova variável seja necessária:

declarar isso no relatório final.

==================================================
110. MIGRATION SAFETY
==================================================

Antes de aplicar migration:

- revisar SQL;
- revisar constraints;
- revisar policies;
- revisar índices;
- verificar nomes;
- verificar dependências;
- verificar dados existentes;
- verificar impacto em produção.

Não aplicar comandos destrutivos.

Não resetar banco.

Não apagar dados.

Não executar seed destrutivo.

Não utilizar db reset em ambiente compartilhado.

==================================================
111. SEEDS
==================================================

Caso exista estratégia de seed:

adicionar projetos fictícios apenas se necessário para desenvolvimento.

Dados fictícios devem:

- ser claramente fictícios;
- não conter dados pessoais reais;
- respeitar tenant;
- respeitar relações;
- não ser executados automaticamente em produção.

Não criar seed se o projeto não utiliza esse padrão.

==================================================
112. COMANDOS DE VALIDAÇÃO
==================================================

Ao finalizar, executar os comandos disponíveis no projeto.

No mínimo, conforme package.json:

- lint;
- typecheck;
- test;
- build.

Exemplos conceituais:

npm run lint

npm run typecheck

npm test

npm run build

Utilizar somente scripts existentes.

Não inventar comandos sem verificar package.json.

==================================================
113. CORREÇÃO DE ERROS
==================================================

Caso algum comando falhe:

- identificar a causa;
- corrigir somente problemas relacionados;
- executar novamente;
- não ignorar erro;
- não mascarar falha;
- não desabilitar regra global para passar;
- não remover teste válido.

Caso exista erro anterior não relacionado:

documentar claramente.

Não alterar arquivos fora do escopo sem necessidade.

==================================================
114. REVISÃO DE ALTERAÇÕES
==================================================

Antes do relatório final:

executar:

git status

git diff --stat

git diff

Revisar:

- arquivos alterados;
- migrations;
- segurança;
- RLS;
- permissões;
- tipagens;
- textos;
- imports;
- código morto;
- console logs;
- TODOs;
- dados sensíveis;
- escopo.

Confirmar que nenhum arquivo indevido foi alterado.

==================================================
115. NÃO FAZER COMMIT
==================================================

Não executar:

git add

git commit

git push

gh pr create

Não criar tag.

Não alterar branch.

Não fazer merge.

Deixar todas as alterações no working tree para revisão humana.

==================================================
116. FORA DO ESCOPO
==================================================

Não implementar nesta sprint:

- Chantiers;
- endereço de obra;
- coordenadas GPS;
- mapas;
- geofencing;
- clock in;
- clock out;
- pausas;
- timesheets;
- aprovação de horas;
- calendário;
- scheduling;
- férias;
- faltas;
- clima;
- relatórios avançados;
- exportação PDF;
- exportação Excel;
- custos;
- rentabilidade;
- faturamento;
- pagamentos;
- payroll;
- CRM;
- cliente completo;
- aplicativo mobile;
- notificações push;
- IA;
- API pública;
- webhooks;
- integrações externas.

Não criar placeholders técnicos desnecessários para esses módulos.

==================================================
117. CRITÉRIOS DE ACEITE FUNCIONAIS
==================================================

A Sprint 4.0 será aceita quando:

1. Usuário autorizado acessa /dashboard/projects.

2. A lista exibe somente projetos da empresa autorizada.

3. Owner/Admin consegue criar projeto.

4. Manager consegue criar conforme permissões definidas.

5. Employee não consegue criar.

6. Projeto possui nome, status e prioridade.

7. Projeto pode possuir responsável.

8. Projeto pode possuir várias equipes.

9. Responsável pertence à empresa.

10. Equipes pertencem à empresa.

11. Código é único por empresa.

12. Projeto pode ser editado por usuário autorizado.

13. Projeto pode ser arquivado sem exclusão física.

14. Projeto arquivado não aparece por padrão.

15. Filtro permite visualizar arquivados.

16. Busca funciona por nome e código.

17. Filtros funcionam em conjunto.

18. Detalhes exibem dados corretos.

19. Dashboard mostra resumo operacional.

20. Projeto atrasado é identificado corretamente.

==================================================
118. CRITÉRIOS DE ACEITE DE SEGURANÇA
==================================================

A Sprint 4.0 será aceita quando:

1. RLS está habilitada.

2. Empresa A não acessa projetos da Empresa B.

3. IDs manipulados não quebram isolamento.

4. company_id não pode ser alterado.

5. Usuário não pode definir responsável externo.

6. Usuário não pode associar equipe externa.

7. DELETE físico não está disponível.

8. Permissões são validadas no servidor.

9. Policies validam tenant.

10. Dados sensíveis não aparecem em logs.

11. Service role não é exposta.

12. Formulários não permitem mass assignment.

==================================================
119. CRITÉRIOS DE ACEITE DE INTERFACE
==================================================

A Sprint 4.0 será aceita quando:

1. Interface usa App Shell.

2. Interface segue Design System.

3. Página é responsiva.

4. Formulários possuem labels.

5. Erros são claros.

6. Loading é visível.

7. Estado vazio é útil.

8. Ações respeitam permissões.

9. Dialog de arquivamento é acessível.

10. Status e prioridade não dependem apenas de cor.

11. Busca e filtros funcionam em mobile.

12. Não existe overflow horizontal indevido.

==================================================
120. CRITÉRIOS DE ACEITE TÉCNICOS
==================================================

A Sprint 4.0 será aceita quando:

1. TypeScript passa.

2. Lint passa.

3. Testes passam.

4. Build passa.

5. Migrations são incrementais.

6. Nenhuma dependência desnecessária foi adicionada.

7. Não existe arquitetura paralela.

8. Não existem erros de console relevantes.

9. Não existem imports não utilizados.

10. Não existem TODOs críticos.

11. Documentação foi atualizada.

12. Roadmap foi atualizado.

==================================================
121. RELATÓRIO INICIAL
==================================================

Antes de modificar arquivos, apresentar no terminal ou resposta de execução um resumo contendo:

- Sprint: 4.0;
- branch atual;
- status do repositório;
- últimos commits;
- arquivos principais encontrados;
- arquitetura identificada;
- autenticação encontrada;
- multi-tenant encontrado;
- permissions system encontrado;
- estrutura de banco encontrada;
- estratégia de implementação;
- riscos identificados.

Não iniciar alterações antes de concluir essa inspeção.

==================================================
122. RELATÓRIO FINAL OBRIGATÓRIO
==================================================

Ao finalizar, entregar relatório estruturado.

Utilizar a seguinte estrutura:

SPRINT EXECUTADA

Sprint 4.0 — Projects Management

RESUMO

Descrição objetiva do que foi implementado.

ARQUIVOS ALTERADOS

Listar todos os arquivos alterados.

ARQUIVOS CRIADOS

Listar todos os arquivos criados.

MIGRATIONS

Informar:

- migrations criadas;
- tabelas;
- colunas;
- constraints;
- índices;
- RLS;
- policies.

ROTAS

Listar rotas criadas ou alteradas.

FUNCIONALIDADES

Listar:

- dashboard;
- listagem;
- criação;
- edição;
- detalhes;
- arquivamento;
- busca;
- filtros;
- equipes;
- responsável.

SEGURANÇA

Informar:

- autenticação;
- autorização;
- multi-tenant;
- RLS;
- proteção contra acesso cruzado;
- proteção de campos.

TESTES

Informar:

- comandos executados;
- testes criados;
- testes manuais;
- resultados.

VALIDAÇÃO

Informar resultados de:

- lint;
- typecheck;
- tests;
- build.

DOCUMENTAÇÃO

Listar documentos atualizados.

DECISÕES

Registrar decisões arquiteturais relevantes.

LIMITAÇÕES

Informar claramente o que não foi implementado.

PRÓXIMA SPRINT

Sprint 4.1 — Chantiers.

GIT STATUS

Exibir estado final do working tree.

COMMIT

Declarar:

Nenhum commit foi criado.

PUSH

Declarar:

Nenhum push foi realizado.

==================================================
123. FORMATO DO RELATÓRIO FINAL
==================================================

O relatório deve ser:

- objetivo;
- verificável;
- sem afirmações falsas;
- baseado nos comandos executados;
- baseado nos arquivos realmente alterados;
- baseado nos testes realmente executados.

Não declarar:

- build aprovado sem executar;
- testes aprovados sem executar;
- RLS validada sem revisar;
- funcionalidade concluída sem implementar;
- documentação atualizada sem alterar arquivo.

==================================================
124. CONDIÇÃO DE INTERRUPÇÃO
==================================================

Interromper e informar antes de continuar caso:

- o repositório esteja em branch inesperada;
- existam alterações locais conflitantes;
- a arquitetura necessária não exista;
- migrations estejam inconsistentes;
- autenticação esteja ausente;
- multi-tenant esteja ausente;
- banco não esteja configurado;
- seja necessária alteração destrutiva;
- seja necessária dependência crítica não prevista;
- o escopo conflite com implementação existente.

Não improvisar soluções destrutivas.

==================================================
125. ORDEM RECOMENDADA DE EXECUÇÃO
==================================================

Executar na seguinte ordem:

1. Verificações Git.

2. Inspeção da arquitetura.

3. Inspeção do banco.

4. Inspeção de autenticação e multi-tenant.

5. Inspeção de Teams e Workforce.

6. Definição do modelo final.

7. Migration incremental.

8. RLS e policies.

9. Tipos e schemas.

10. Data layer.

11. Permissões.

12. Rotas.

13. Lista e dashboard.

14. Criação.

15. Detalhes.

16. Edição.

17. Equipes e responsável.

18. Arquivamento.

19. Busca, filtros e paginação.

20. Estados de interface.

21. Testes.

22. Documentação.

23. Lint.

24. Typecheck.

25. Tests.

26. Build.

27. Revisão do diff.

28. Relatório final.

==================================================
126. RESULTADO FINAL ESPERADO
==================================================

Ao final da Sprint 4.0, o STRATON deve possuir um módulo Projects:

- funcional;
- seguro;
- multi-tenant;
- integrado com Companies;
- integrado com Memberships;
- integrado com Teams;
- responsivo;
- acessível;
- documentado;
- preparado para Chantiers;
- preparado para Time Tracking;
- preparado para Timesheets;
- preparado para Scheduling;
- preparado para relatórios futuros.

O módulo deve permitir que empresas organizem seus projetos sem misturar dados entre tenants e sem antecipar funcionalidades das próximas sprints.

==================================================
127. INSTRUÇÃO FINAL
==================================================

Execute exclusivamente a Sprint 4.0 — Projects Management.

Preserve todo o trabalho existente.

Não faça commit.

Não faça push.

Não avance para a Sprint 4.1.

Ao concluir:

entregue o relatório final obrigatório e aguarde revisão humana.