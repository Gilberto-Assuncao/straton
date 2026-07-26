# Serviços e ferramentas

> Inventário levantado do próprio código e das configurações em 2026-07-26 —
> `package.json`, `src/infrastructure/`, variáveis de ambiente do Vercel e
> chamadas HTTP externas encontradas no código. Não é uma lista de memória.

Quando um serviço for adicionado ou substituído, atualizar aqui **e** registar a
razão no documento de arquitetura correspondente.

---

## 1. Alojamento e código

| Serviço | Para quê | Onde se gere |
|---|---|---|
| **Vercel** | Alojamento, builds, deploy automático a cada push, cron | [vercel.com](https://vercel.com) · equipa `belnex-energy`, projeto `straton` |
| **GitHub** | Repositório e issues | [Gilberto-Assuncao/straton](https://github.com/Gilberto-Assuncao/straton) |
| **DNS Belgium / 158.nl** | Registo do domínio `straton.be` | Painel do 158.nl |

**Domínio:** `straton.be` e `www.straton.be`, com nameservers delegados ao
Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). SSL automático, renovação
a cada 90 dias.

⚠️ **A renovação automática do domínio está desligada** no 158.nl. Expira a
**26-07-2027**. Um `.be` que expira entra em quarentena e pode ser apanhado por
terceiros.

---

## 2. Base de dados e autenticação

| Serviço | Para quê |
|---|---|
| **Supabase** | PostgreSQL 17, autenticação, RLS, migrações |

- Referência do projeto: `ioozswzauonfmwohfvpl` · região `eu-west-3` (Paris)
- Nome de exibição ainda `supabase-beige-horizon` — pendente na [#18](https://github.com/Gilberto-Assuncao/straton/issues/18), puramente cosmético
- Provisionado **através da integração do Vercel** (organização `vercel_icfg_…`), pelo que se gere a partir do Vercel, não do painel do Supabase
- 35 tabelas, RLS ativo em todas, 25 migrações em `supabase/migrations/`

---

## 3. Email

| Serviço | Para quê |
|---|---|
| **Brevo** | SMTP para todos os emails de autenticação |

- `smtp-relay.brevo.com`, porta 587, configurado nas definições de Auth do Supabase
- Domínio `straton.be` autenticado com 7 registos DNS: DKIM 1 e 2, subdomínio de marca `em`, redirecionamento de imagens e links, DMARC, código de verificação
- Restrição de IP das chaves SMTP **desativada** — o Supabase envia de IPs dinâmicos e não há lista fixa para autorizar
- Sem registo SPF: o Brevo não o exige e o DMARC passa por alinhamento DKIM. Confirmado na prática (email recebido na caixa de entrada, não no spam)

**Porquê o Brevo:** empresa francesa com centros de dados na Alemanha e França
— residência de dados na UE por omissão. A plataforma processa folha de
pagamento e registos de funcionários; o Postmark foi descartado por manter todo
o conteúdo e metadados nos EUA sem planos de mudar. Ver [#16](https://github.com/Gilberto-Assuncao/straton/issues/16).

**Cobre quatro fluxos:** confirmação de registo, recuperação de palavra-passe,
**convite de funcionário** e magic link.

---

## 4. APIs externas

| API | Para quê | Autenticação | Custo |
|---|---|---|---|
| **CBE API** ([cbeapi.be](https://cbeapi.be)) | Dados de empresas belgas (KBO/BCE) | Bearer, `CBE_API_KEY` | Camada gratuita |
| **VIES** (Comissão Europeia) | Validação de IVA no resto da UE | Nenhuma | Gratuito |
| **Open-Meteo** | Previsão do tempo por obra | Nenhuma | Gratuito |

**CBE** — `https://cbeapi.be/api`, `GET /v1/company/{cbeNumber}`. Devolve campos
estruturados: rua e número separados, número de empresa, forma jurídica, data de
início de atividade, códigos NACE, contactos. Respostas em cache por 24 h.
Cliente em `src/infrastructure/cbe/client.ts`.

**VIES** — `https://ec.europa.eu/taxation_customs/vies/rest-api/`. Continua a
servir todos os países exceto a Bélgica, e é a alternativa quando o CBE está
indisponível. Cliente em `src/infrastructure/vies/client.ts`.

Ver [`COMPANY_MANAGEMENT.md`](COMPANY_MANAGEMENT.md) para a razão da divisão.

**Open-Meteo** — `https://api.open-meteo.com`. Sem chave, sem registo. Alimenta
os alertas de risco por obra em `src/infrastructure/weather/` e
`src/features/weather/alerts.ts`. Só funciona para obras **com coordenadas** —
daí a [#31](https://github.com/Gilberto-Assuncao/straton/issues/31).

---

## 5. Variáveis de ambiente

Todas em Vercel → Settings → Environment Variables.

| Variável | Ambiente | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Pública, chega ao browser |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Pública, protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **Ignora o RLS** — só servidor |
| `CBE_API_KEY` | Production, Preview | Marcada como *sensitive* |
| `APP_URL` | Production | `https://straton.be`. Gera os links dos emails de convite |
| `APP_ENV` | Production | |
| `CRON_SECRET` | Production | Autentica o cron de pontualidade |

**Sobre variáveis *sensitive*:** o Vercel não as devolve no `vercel env pull` —
recebe-se `[SENSITIVE]` em vez do valor. É o comportamento correto e significa
que a chave não é extraível pelo CLI. A contrapartida é não se poder testar
localmente com a chave de produção.

**Nunca colar uma chave numa conversa, num ficheiro do repositório ou numa
issue.** Se acontecer, revogar e gerar outra: o histórico não se apaga.

---

## 6. Stack da aplicação

| | Versão | Nota |
|---|---|---|
| **Next.js** | 16.2.10 | App Router. Ver `AGENTS.md` — esta versão tem alterações que quebram em relação ao conhecido |
| **React** | 19.2.4 | |
| **TypeScript** | ^5 | `npm run typecheck` |
| **Tailwind CSS** | ^4 | Via `@tailwindcss/postcss` |
| **next-intl** | ^4.13.3 | 9 idiomas: en, pt, fr, nl, de, pl, ro, es, it |
| **Vitest** | ^4.1.10 | Apenas 3 ficheiros de teste — ver [#26](https://github.com/Gilberto-Assuncao/straton/issues/26) |
| **ESLint** | ^9 | `npm run lint` |
| Node | 24.x | Definido no Vercel |

Dependências de produção: apenas seis (`@supabase/ssr`, `@supabase/supabase-js`,
`next`, `next-intl`, `react`, `react-dom`). Vale a pena manter assim.

---

## 7. Automação

**Cron do Vercel** — `vercel.json`:

```json
{ "crons": [ { "path": "/api/cron/punctuality", "schedule": "0 7 * * *" } ] }
```

Lembretes de pontualidade, diariamente às 07:00 UTC. Autenticado por
`CRON_SECRET`. O plano Hobby limita a frequência — ver [#6](https://github.com/Gilberto-Assuncao/straton/issues/6).

**CI** — `.github/workflows/ci.yml`. Confirmar que corre `lint`, `typecheck`,
`test` e `build` a cada PR ([#26](https://github.com/Gilberto-Assuncao/straton/issues/26)).

---

## 8. Lacunas conhecidas

| Falta | Issue |
|---|---|
| **Observabilidade** — sem captura de erros nem alertas em produção | [#27](https://github.com/Gilberto-Assuncao/straton/issues/27) |
| **Login social** (Google, Apple, Microsoft) — os botões existem, os fornecedores não estão configurados | [#15](https://github.com/Gilberto-Assuncao/straton/issues/15) |
| **Geocodificação** — coordenadas das obras ainda escritas à mão | [#31](https://github.com/Gilberto-Assuncao/straton/issues/31) |
| **Faturação** | [#10](https://github.com/Gilberto-Assuncao/straton/issues/10) |
| **Mobile** — pré-requisito da Agenda, não extra | [#12](https://github.com/Gilberto-Assuncao/straton/issues/12) |

**Critério ao escolher fornecedores:** residência de dados na UE. Não é
preferência — a plataforma processa dados de folha de pagamento e registos de
trabalhadores de empresas belgas. Foi o que decidiu o Brevo contra o Postmark, e
deve decidir a observabilidade também.
