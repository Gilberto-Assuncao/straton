-- O inventário de objetos do esquema, para o #91.
--
-- Corre contra qualquer base e imprime uma linha por objeto. O mesmo ficheiro
-- é usado dos dois lados — a base que o CI constrói a partir das migrações, e
-- a base hospedada — para que uma diferença no resultado não possa vir da
-- forma de perguntar.
--
-- O resultado esperado está em `schema-inventory.txt`, e o `rls-isolation`
-- compara-o a cada push. A fonte da verdade é o repositório: se uma alteração
-- de esquema for intencional, o ficheiro é atualizado no mesmo commit que a
-- migração.
--
-- Inventário e não `pg_dump`, de propósito. Um dump são milhares de linhas de
-- DDL onde a ordem das cláusulas e o espaçamento produzem ruído que não é
-- divergência nenhuma. A pergunta aqui é *que objetos existem*, e essa tem uma
-- resposta curta e comparável com `diff`.
--
-- Fora do inventário ficam os índices e as constraints: são reescritos pelo
-- Postgres com nomes gerados que diferem entre bases sem nada ter divergido.
-- Entram quando houver uma forma estável de os nomear.
--
-- Uso:
--   psql "$URL" -At -f supabase/schema-inventory.sql

select o from (
  select 'col:' || table_name || '.' || column_name as o
  from information_schema.columns
  where table_schema = 'public'

  union all

  -- `pg_get_function_identity_arguments` e não `prosrc`: o que interessa é a
  -- assinatura que o chamador vê. Duas versões da mesma função com argumentos
  -- diferentes são dois objetos, e foi exatamente assim que
  -- `worked_hours_by_subdivision` deixou de aceitar um uuid e passou a aceitar
  -- um array (202608120001).
  select 'fn:' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prokind = 'f'

  union all

  select 'pol:' || tablename || '.' || policyname
  from pg_policies
  where schemaname = 'public'

  union all

  -- `tgisinternal` exclui os gatilhos que o Postgres cria sozinho para as
  -- chaves estrangeiras, que não são código deste projeto.
  select 'trg:' || c.relname || '.' || t.tgname
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal and n.nspname = 'public'
) x
order by o;
