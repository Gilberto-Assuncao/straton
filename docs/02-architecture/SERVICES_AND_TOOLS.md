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

**Cobre cinco fluxos:** confirmação de registo, recuperação de palavra-passe,
**convite de funcionário**, **convite de empresa** ([#20](https://github.com/Gilberto-Assuncao/straton/issues/20))
e magic link.

**Limite conhecido do convite de empresa.** O envio usa
`auth.admin.inviteUserByEmail`, que só funciona para um endereço **sem conta**.
Alguém que já tenha login no STRATON — por trabalhar noutra empresa da
plataforma — não recebe email nenhum. Isso não é tratado como erro: o convite é
criado à mesma e o link fica visível para o gestor o enviar como quiser. Na
prática é o melhor comportamento mesmo quando o email é enviado, porque emails
perdem-se e vão para spam, e quem convida costuma ter o telefone do
subcontratado à mão.

Enviar um email próprio (com o nosso texto, em vez do modelo do Supabase)
exigiria a API do Brevo e mais uma variável de ambiente. Não se justificou
ainda.

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

## 8. Observabilidade

Sem fornecedor externo, e isso é uma decisão e não uma pendência. **O Vercel já
recolhe** os erros de execução e agrupa-os. O que faltava não era recolha — era
estrutura e alguém ser avisado.

### O que existe

**`instrumentation.ts`** (raiz, ao lado de `app/`) — o `onRequestError` do Next
apanha tudo o que rebenta a renderizar um componente de servidor, num *route
handler* ou numa *server action*, e emite uma linha JSON.

**`src/infrastructure/observability/logger.ts`** — uma linha JSON por evento.
O formato importa mais do que o destino: `console.error("falhou", err)` produz
algo que ninguém consegue filtrar; `{"event":"invite_email_failed"}` pode ser
contado, agrupado e alertado.

O `LogContext` é uma **lista fechada de campos**, não `Record<string, unknown>`.
Registos são enviados, retidos e lidos por gente que não está a olhar para o
código — "espalha aí o objeto" é como um email, um token ou uma linha inteira de
salários acaba num agregador de logs.

**`src/i18n/request.ts`** — `onError` que **rebenta em desenvolvimento** e
regista em produção. Uma tradução em falta nunca deve derrubar uma página em
produção, mas em desenvolvimento tem de ser impossível de ignorar. O
`getMessageFallback` devolve a chave crua de propósito: é feio, e é esse o
ponto — assim lê-se como defeito e não como um rótulo que alguém escolheu.

### O que falta, e é um clique teu

**Alerta sobre grupos de erro novos.** No painel do Vercel, em *Observability →
Alerts*. Sem isto, tudo o que está acima continua a ser um sítio onde procurar
em vez de algo que nos procura.

Consultar erros agrupados, entretanto: painel do Vercel, ou o campo `event` nos
registos de execução.

### Erros crus a chegar ao utilizador

Restam **51 sítios** que devolvem `error.message` diretamente ao ecrã — foi
assim que `535 5.7.8 Authentication failed` e a string literal `{}` foram
parar à frente de um cliente. `tests/unit/raw-error-leaks.test.ts` é uma
**catraca**: não exige zero, exige *não mais do que hoje*, por ficheiro. A lista
só pode encolher.

---

## 9. Lacunas conhecidas

| Falta | Issue |
|---|---|
| **Alerta de erros** — a recolha e a estrutura existem, falta a notificação | [#27](https://github.com/Gilberto-Assuncao/straton/issues/27) |
| **Login social** (Google, Apple, Microsoft) — os botões existem, os fornecedores não estão configurados | [#15](https://github.com/Gilberto-Assuncao/straton/issues/15) |
| **Geocodificação** — coordenadas das obras ainda escritas à mão | [#31](https://github.com/Gilberto-Assuncao/straton/issues/31) |
| **Faturação** | [#10](https://github.com/Gilberto-Assuncao/straton/issues/10) |
| **Mobile** — pré-requisito da Agenda, não extra | [#12](https://github.com/Gilberto-Assuncao/straton/issues/12) |

**Critério ao escolher fornecedores:** residência de dados na UE. Não é
preferência — a plataforma processa dados de folha de pagamento e registos de
trabalhadores de empresas belgas. Foi o que decidiu o Brevo contra o Postmark, e
deve decidir a observabilidade também.
