-- A subscrição pode ser limitada a um setor (#83)
--
-- "todos os envolvidos naquele local, Elétrica da Sala, porém o gestor da obra
--  possa escolher. Exemplo selecionar todas as empresas e funcionários, ou
--  somente A ou B, por setor, etc"
--
-- O #86 já modelava a primeira metade: o público é escolhido, e escolhido em
-- dois níveis — a empresa do local escolhe as suas pessoas e escolhe empresas,
-- cada empresa escolhida escolhe as suas. O que falta é a terceira forma de
-- estreitar: por setor.
--
-- Interpretação, dita aqui porque a alternativa era plausível e mais cara: isto
-- limita a *subscrição*, não realoca pessoas. `site_crew` continua a alocar ao
-- local, e ninguém passa a ter de manter quem trabalha em que subdivisão — o
-- gestor escolhe a pessoa e diz sobre o que ela é notificada.
--
--   site_area_id nulo       -> o local inteiro, incluindo todos os setores
--   site_area_id preenchido -> só aquele setor
--
-- Alguém subscrito ao local ouve tudo o que lá acontece, setores incluídos.
-- É o que "todos os envolvidos naquele local" quer dizer, e é o que torna o
-- valor nulo o comportamento por omissão em vez de um caso especial.

alter table public.site_notification_subscribers
  -- `cascade`, deliberadamente, e não `set null`. Anular alargaria a subscrição
  -- de um setor para o local inteiro no momento em que alguém apagasse a
  -- subdivisão — silenciosamente, e no sentido errado: mais gente a receber
  -- mais coisas, que é exatamente a falha que esta funcionalidade não pode ter.
  -- Se o setor desaparece, a subscrição que só falava dele desaparece com ele.
  add column if not exists site_area_id uuid references public.site_areas(id) on delete cascade;

comment on column public.site_notification_subscribers.site_area_id is
  'O setor a que esta subscrição se limita (#83). Nulo significa o local inteiro, que é o caso comum — e alguém subscrito ao local ouve também o que acontece nos seus setores.';

-- A restrição antiga dizia "uma linha por pessoa por local", o que passou a
-- estar errado: a mesma pessoa pode ouvir o local inteiro e, separadamente,
-- estar na lista de um setor específico.
--
-- `nulls not distinct` porque sem isso duas linhas com `site_area_id` nulo não
-- colidem — o Postgres trata nulos como distintos entre si — e a mesma pessoa
-- podia ser subscrita ao local vezes sem conta, recebendo duplicados.
alter table public.site_notification_subscribers
  drop constraint if exists site_notification_subscribers_site_id_user_id_key;

alter table public.site_notification_subscribers
  drop constraint if exists site_notification_subscribers_unique_scope;

alter table public.site_notification_subscribers
  add constraint site_notification_subscribers_unique_scope
  unique nulls not distinct (site_id, user_id, site_area_id);

/**
 * O subscritor pertence à empresa que o subscreveu, e o setor pertence ao local.
 *
 * A primeira metade já cá estava. A segunda é nova e é da mesma família: o
 * `site_area_id` chega do cliente, e a política de insert só verifica os
 * valores que lhe foram entregues — sem esta verificação seria possível
 * apontar uma subscrição para uma subdivisão de outro chantier, que é uma
 * forma de descobrir que ela existe.
 */
create or replace function private.enforce_site_subscriber()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  area_site uuid;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  if not exists (
    select 1 from public.company_memberships m
    where m.company_id = new.company_id
      and m.user_id = new.user_id
      and m.status = 'active'
  ) then
    raise exception 'That person is not an active member of this company.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.site_area_id is not null then
    select a.site_id into area_site from public.site_areas a where a.id = new.site_area_id;

    if area_site is null then
      raise exception 'That subdivision does not exist.' using errcode = 'foreign_key_violation';
    end if;

    if area_site is distinct from new.site_id then
      raise exception 'That subdivision belongs to a different work location.'
        using errcode = 'check_violation';
    end if;
  end if;

  new.created_by := (select auth.uid());
  return new;
end;
$$;

/**
 * Quem tem de ser avisado sobre isto.
 *
 * Calculado no servidor, no momento do evento — não na leitura. Recalcular
 * "quem estava envolvido" com a lista de hoje faria com que quem saiu da obra
 * continuasse a ver o passado, e quem entrou visse o que aconteceu antes de lá
 * estar. Era o que a issue pedia explicitamente.
 *
 * `p_site_area_id` nulo é um acontecimento sobre o local em si — a morada
 * mudou, o cliente mudou — e nesse caso ninguém está a ser avisado sobre um
 * setor, portanto as subscrições limitadas a setores ficam de fora. Preenchido,
 * junta as duas: quem ouve o local inteiro, e quem escolheu aquele setor.
 *
 * `security definer` porque o público atravessa empresas por desenho: o
 * publicador precisa da lista completa, e quem a lê pelo ecrã continua a ver
 * apenas a sua parte — essa é a política de leitura, e não muda por causa
 * desta função.
 */
create or replace function private.site_notification_audience(
  p_site_id uuid,
  p_site_area_id uuid default null
)
returns table (user_id uuid, company_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct s.user_id, s.company_id
  from public.site_notification_subscribers s
  where s.site_id = p_site_id
    and (
      s.site_area_id is null
      or (p_site_area_id is not null and s.site_area_id = p_site_area_id)
    )
$$;

revoke all on function private.site_notification_audience(uuid, uuid) from public, anon;
grant execute on function private.site_notification_audience(uuid, uuid) to service_role;
