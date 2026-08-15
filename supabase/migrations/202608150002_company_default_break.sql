-- A pausa por omissão da empresa, que existia na base e não aqui (#91)
--
-- Esta coluna foi aplicada diretamente à base hospedada a 2026-08-09, como
-- `company_default_break`, e nunca chegou ao repositório. O código lê-a desde
-- então:
--
--   src/features/time-tracking/actions.ts
--     .select("default_break_minutes")
--
-- O efeito era o pior tipo: numa base construída de raiz a partir destas
-- migrações a coluna não existe, e o cálculo automático da pausa ao picar a
-- saída falha. Não apareceu em lado nenhum porque nenhum dos 174 testes de RLS
-- toca nesse caminho — o `rls-isolation` construía, sem o saber, um esquema
-- diferente do de produção.
--
-- Foi encontrada pelo inventário de esquema do #91, e era a *única* divergência
-- em 672 objetos. As outras nove migrações que só existiam na base tinham sido
-- consolidadas nos ficheiros correspondentes; esta não.
--
-- A definição abaixo é a da base hospedada, lida de `information_schema` e
-- `pg_constraint` em vez de reconstruída de memória. O limite de 480 minutos
-- são oito horas: uma pausa por omissão maior do que um dia de trabalho é um
-- erro de digitação, não uma política de empresa.
--
-- `if not exists` porque a base hospedada já a tem — aplicar esta migração lá
-- alinha o registo de migrações sem tocar no esquema.

alter table public.company_settings
  add column if not exists default_break_minutes integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_settings_default_break_minutes_check'
  ) then
    alter table public.company_settings
      add constraint company_settings_default_break_minutes_check
      check (default_break_minutes >= 0 and default_break_minutes <= 480);
  end if;
end $$;

comment on column public.company_settings.default_break_minutes is
  'Pausa descontada por omissão quando alguém pica a saída sem indicar uma (#91). Zero significa sem pausa automática.';
