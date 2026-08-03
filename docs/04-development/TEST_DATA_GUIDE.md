# Dados de teste — como adicionar e como remover

Três métodos, para três situações diferentes. Não são alternativas: usam-se
em conjunto.

| Método | Onde corre | Reversível? | Custo | Serve para |
|---|---|---|---|---|
| **1. Namespace por prefixo** | Qualquer BD, incluindo produção | Sim, por script | Grátis | Demonstrações, QA manual, mostrar o produto |
| **2. Supabase local** | Máquina do programador | Sim, `db reset` | Grátis | Desenvolvimento diário |
| **3. Transação com rollback** | Testes automatizados | Sim, automático | Grátis | Testes de integração e de RLS |

---

## Método 1 — Namespace por prefixo de UUID

**É o método já implementado.** Todos os dados de demonstração carregam um
prefixo de UUID reconhecível e um domínio de email dedicado:

| Marcador | Valor |
|---|---|
| Empresas | `d0000001-…` |
| Utilizadores | `d0000002-…` |
| Membros | `d0000003-…` |
| Equipas / obras / projetos | `d0000004-…` / `d0000005-…` / `d0000006-…` |
| Email das contas demo | `*.straton.demo` |

Como nenhum registo real pode ter estes valores, a remoção é uma operação
segura mesmo em produção.

```bash
# adicionar
npm run demo:seed

# remover
npm run demo:down

# recarregar do zero
npm run demo:reset
```

Requer `DATABASE_URL` no ambiente (Supabase → Settings → Database → Connection
string). Os scripts correm com `ON_ERROR_STOP=1`, portanto param à primeira
falha em vez de deixarem a base a meio.

### Porque é seguro

O `seed-demo-down.sql` nunca faz `delete` sem filtro. Cada instrução filtra
por prefixo de UUID **e**, no caso das pessoas, cruza também com o domínio
`.straton.demo`. Um utilizador real teria de ter simultaneamente um UUID
começado por `d0000002-` e um email `.straton.demo` para ser apanhado.

O ficheiro termina com uma query de verificação em que **todas as contagens
têm de dar 0**. Se alguma não der, sobrou dado demo.

### O dataset envelhece

Todas as datas do seed são relativas a `current_date`: seis semanas de horas
para trás, check-ins de hoje, períodos de folha do mês corrente. Isso torna a
demonstração convincente no dia em que é aplicada — e desatualizada uma semana
depois.

Sintoma típico: o mapa ao vivo e o separador "em obra hoje" ficam vazios,
porque a "semana corrente" do seed já passou.

```bash
npm run demo:reset
```

Regenera tudo relativo à data atual. Vale a pena correr antes de qualquer
demonstração a um cliente.

### Limitação

Partilha a base com dados reais. Serve para demonstrar e para QA manual, mas
**não** para testes automatizados que corram em paralelo — dois testes a
mexer nas mesmas linhas dão falsos negativos.

---

## Método 2 — Supabase local

Para desenvolvimento diário, o melhor isolamento é não tocar na base remota.

```bash
npx supabase start
npx supabase db reset
```

O `db reset` recria a base do zero: aplica as 25 migrações por ordem e depois
corre o `supabase/seed.sql`. Nada sobrevive — é o teardown mais completo que
existe.

Para ter as três empresas de demonstração também no ambiente local, basta
acrescentar o seed de demo ao fim do reset:

```bash
npx supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed-demo.sql
```

Vantagem adicional: valida que as migrações correm de raiz, o que a base
remota nunca testa (lá, aplicam-se sempre incrementalmente).

---

## Método 3 — Transação com rollback (testes automatizados)

**Implementado** em `tests/helpers/db.ts` e `tests/rls/company-isolation.test.ts`.

A ideia: cada teste abre uma transação, insere o que precisa, faz as
asserções, e no fim faz `ROLLBACK`. A base fica exatamente como estava, sem
script de limpeza nenhum e sem risco de um teste falhado deixar lixo.

```ts
// tests/helpers/db.ts
import { Client } from "pg";

export async function withRollback(fn: (db: Client) => Promise<void>) {
  const db = new Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  await db.query("begin");
  try {
    await fn(db);
  } finally {
    await db.query("rollback");   // sempre, mesmo se o teste falhar
    await db.end();
  }
}
```

```ts
// exemplo de uso
it("isola dados entre empresas", async () => {
  await withRollback(async (db) => {
    await db.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userDaEmpresaA }),
    ]);
    const { rows } = await db.query("select id from projects");
    expect(rows.every((r) => r.company_id === empresaA)).toBe(true);
  });
});
```

### Como correr

```bash
npx supabase start
npx supabase db reset && psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed-demo.sql
TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres" npm run test:rls
```

Sem `TEST_DATABASE_URL` os testes **passam ignorados**, não falham — para o
`npm test` continuar utilizável em máquinas sem base local. O reverso disso é
que uma suite verde não prova isolamento nenhum se a variável faltar: o CI tem
de a definir.

### Duas salvaguardas que valem mais que os testes

**`assertRlsIsEnforced`** corre antes de tudo e recusa uma ligação com
`BYPASSRLS`. É a falha mais perigosa desta categoria: ligado como superutilizador,
todos os testes de isolamento passam e não provam absolutamente nada.

**O teste-espelho** verifica que a empresa continua a ver os *seus próprios*
dados. Sem ele, uma policy que negasse tudo passaria os dez testes de
isolamento.

### Porque isto importa aqui

O projeto tem RLS ativo nas 35 tabelas, e uma regressão numa policy expõe dados
de um cliente a outro sem que o `typecheck` ou o `build` percebam. Não é
hipotético: em 2026-08-01 dois defeitos de RLS chegaram a produção com o build
verde — um parâmetro sombreado por uma coluna que tornou **todas as empresas
legíveis**, e uma restrição única em falta que duplicava relações. Ambos foram
apanhados por desconfiança de um número, não por automação.

---

## Recomendação

1. **Já disponível** — `npm run demo:seed` / `demo:down` para demonstrações e QA manual
2. **A seguir** — usar Supabase local no dia a dia, em vez da base remota
3. ✅ **Feito** — helper de rollback e isolamento de RLS entre empresas
4. **A seguir**, pela mesma via:
   - aprovação de folha de horas (transições de estado)
   - consolidação de folha de pagamento (aritmética dos minutos)
   - matriz de permissões por papel

---

## Regra a manter

Qualquer dado inserido para teste tem de ser removível por um comando único e
determinístico. Se não houver forma automática de o apagar, não entra na base.
