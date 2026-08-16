# STRATON

Plataforma SaaS multi-tenant para controle de horas, equipes, projetos e sites — Bélgica-first, multi-idioma, pronta para qualquer segmento (não só construção civil).

**Produção:** https://straton.be

## Stack

- **Next.js 16** (App Router, Server Components/Actions, Turbopack)
- **Supabase** (Postgres + Auth + Storage), com RLS em todas as tabelas
- **next-intl** — 9 idiomas: en, pt, fr, nl, de, pl, ro, es, it
- **Vitest** para testes unitários, **GitHub Actions** para CI
- Deploy na **Vercel**, incluindo um Cron Job (lembretes de pontualidade)

## Funcionalidades

- Autenticação multi-empresa (multi-tenant), com convite de funcionário por e-mail e fluxo de aceite
- Time Tracking (cronômetro + entrada manual), Timesheets (submissão/aprovação), Workforce, Teams, Projects
- Sites com previsão do tempo (Weather Intelligence) e risco de atraso
- Live Operations Map — localização por consentimento explícito do funcionário
- Relatório de divergência de horas por time/site
- Lembretes de pontualidade (job agendado)
- Autofill de dados de empresa via VIES (API oficial da UE, gratuita)

## Documentação

A documentação completa do produto e arquitetura está em [`docs/`](docs/README.md), organizada em:
`00-governance`, `01-product`, `02-architecture`, `03-design`, `04-development`, `05-sprints`, `06-roadmap`, `07-vision`.

## Rodando localmente

```bash
npm install
npx supabase start   # sobe o Supabase local (Docker)
npx supabase db reset # aplica migrations + seed
npm run dev
```

Contas de demonstração (após o seed): `admin@straton.local`, `supervisor@straton.local`, `employee@straton.local` — senha `straton-local-only`.

## Testes e qualidade

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Todos os quatro rodam automaticamente no CI (`.github/workflows/ci.yml`) a cada push/PR em `main`.

## Deploy

Deploy contínuo na Vercel via GitHub. Variáveis de ambiente necessárias em produção: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `CRON_SECRET`.
