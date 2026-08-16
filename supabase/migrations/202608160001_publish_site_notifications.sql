-- O publicador precisa de chamar o resolvedor de público (#83)
--
-- `private.site_notification_audience` foi escrita em 202608150003 e é a única
-- descrição de quem tem de ser avisado. O problema é prático: o PostgREST só
-- expõe os esquemas em `config.toml`, que são `public` e `graphql_public`, e o
-- publicador fala com a base por ele. A função existe e não é alcançável.
--
-- A alternativa era reproduzir a regra em TypeScript, lendo a tabela com a
-- chave de serviço. Recusada: a regra de quem recebe passaria a ter dois
-- sítios onde estar errada, e é precisamente a regra em que estar errado
-- significa mandar a notificação a mais gente do que devia.
--
-- Portanto um invólucro fino, e a parte que interessa são os grants. Sem
-- `revoke`, uma função `security definer` em `public` fica chamável por
-- qualquer sessão iniciada através de `/rest/v1/rpc/…` — e esta devolve o
-- público *inteiro*, atravessando empresas por desenho. Seria o oposto do que
-- a delegação em dois níveis existe para proteger: qualquer pessoa com sessão
-- a perguntar quem da GeoTech está a ouvir.
--
-- Só o papel de serviço, que é o do publicador e de mais ninguém.

create or replace function public.site_notification_audience(
  p_site_id uuid,
  p_site_area_id uuid default null
)
returns table (user_id uuid, company_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select a.user_id, a.company_id
  from private.site_notification_audience(p_site_id, p_site_area_id) a
$$;

revoke all on function public.site_notification_audience(uuid, uuid) from public, anon, authenticated;
grant execute on function public.site_notification_audience(uuid, uuid) to service_role;

comment on function public.site_notification_audience(uuid, uuid) is
  'Invólucro de private.site_notification_audience para o publicador (#83). Em public apenas porque o PostgREST não expõe private; chamável só pelo papel de serviço, porque devolve o público de todas as empresas do local.';
