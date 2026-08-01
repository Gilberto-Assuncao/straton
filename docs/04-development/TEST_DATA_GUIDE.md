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

Este é o método correto para a suite de testes, e é o que **ainda falta
montar** — hoje existem apenas 3 ficheiros de teste, todos de validação pura,
nenhum toca na base de dados.

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

Requer instalar `pg` como dependência de desenvolvimento e apontar
`TEST_DATABASE_URL` para a base **local** (nunca a de produção).

### Porque isto importa aqui

O projeto tem RLS ativo nas 35 tabelas, mas **não existe um único teste que
prove o isolamento entre empresas**. É o teste mais valioso que falta: uma
regressão numa policy de RLS expõe dados de um cliente a outro, e nada no
`typecheck` nem no `build` a apanha.

---

## Recomendação

1. **Já disponível** — `npm run demo:seed` / `demo:down` para demonstrações e QA manual
2. **A seguir** — usar Supabase local no dia a dia, em vez da base remota
3. **Prioritário** — montar o helper de rollback e escrever, no mínimo:
   - isolamento de RLS entre empresas
   - aprovação de folha de horas (transições de estado)
   - consolidação de folha de pagamento (aritmética dos minutos)
   - matriz de permissões por papel

---

## Regra a manter

Qualquer dado inserido para teste tem de ser removível por um comando único e
determinístico. Se não houver forma automática de o apagar, não entra na base.
