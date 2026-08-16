import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import { log } from "@/src/infrastructure/observability/logger";

/**
 * Quem é avisado quando este local muda (#83).
 *
 * O ecrã que isto alimenta tem duas metades assimétricas, e a assimetria é a
 * funcionalidade — não uma limitação por implementar:
 *
 *   as minhas pessoas   nomes, porque são colegas
 *   as outras empresas  contagens, nunca nomes
 *
 * A RLS já garante isto (`site_notification_subscribers_read_own_company`), e
 * `getSiteAudience` não conseguiria ler a lista de outra empresa nem que
 * tentasse. O que este ficheiro acrescenta é não *pedir* — porque uma consulta
 * que devolve zero linhas por causa de uma política parece um chantier sem
 * subscritores, e o ecrã diria a coisa errada com toda a confiança.
 *
 * O mesmo raciocínio, aplicado tarde demais, é o que este ficheiro já falhou
 * uma vez: a primeira versão descartava o `error` das quatro consultas, e um
 * embed ambíguo recusado pelo PostgREST chegou ao ecrã como "ninguém está a
 * ouvir". Nada distinguia isso da verdade.
 */

export interface SiteSubscriber {
  id: string;
  userId: string;
  name: string;
  /** Nulo quando ouve o local inteiro, que é o caso comum. */
  areaId: string | null;
  areaName: string | null;
}

/** Uma empresa parceira a ouvir, e quantas pessoas — nunca quais. */
export interface SubscribingCompany {
  companyId: string;
  companyName: string;
  subscriberCount: number;
}

export interface SiteAudience {
  subscribers: SiteSubscriber[];
  companies: SubscribingCompany[];
  /** Colegas que ainda podem ser acrescentados, já sem os que lá estão. */
  candidates: { userId: string; name: string }[];
  areas: { id: string; name: string; isDefault: boolean }[];
}

interface SubscriberRow {
  id: string;
  user_id: string;
  site_area_id: string | null;
  users: { display_name: string | null; name: string | null } | null;
  site_areas: { name: string } | null;
}

/** O primeiro nome que não seja vazio, porque as colunas convivem há muito. */
function personName(row: SubscriberRow["users"]): string {
  return row?.display_name?.trim() || row?.name?.trim() || "—";
}

export async function getSiteAudience(siteId: string): Promise<SiteAudience> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const [subscriberResult, companyResult, areaResult, memberResult] =
    await Promise.all([
      supabase
        // The embed is named after the foreign key, not the table. Both of
        // these carry *two* references to `users` — `user_id` and, on one,
        // `created_by`, on the other `invited_by` — and PostgREST refuses an
        // ambiguous embed rather than picking one. It refuses with an error,
        // which the first version of this file discarded: the list came back
        // empty and the screen said nobody was listening, confidently.
        .from("site_notification_subscribers")
        .select("id,user_id,site_area_id,users!site_notification_subscribers_user_id_fkey(display_name,name),site_areas(name)")
        .eq("site_id", siteId)
        // Redundante com a política, e escrito na mesma. A política é a
        // garantia; isto é a intenção, e quem ler a consulta a seguir não tem
        // de a inferir do esquema.
        .eq("company_id", companyId),
      supabase.rpc("site_subscriber_companies", { p_site_id: siteId }),
      supabase
        .from("site_areas")
        .select("id,name,is_default")
        .eq("site_id", siteId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("company_memberships")
        .select("user_id,users!company_memberships_user_id_fkey(display_name,name)")
        .eq("company_id", companyId)
        .eq("status", "active"),
    ]);

  // Read, not discarded. An empty list and a refused query look identical to
  // this screen, and they mean opposite things: "nobody is listening" versus
  // "we could not find out". Saying the first when the second is true is the
  // failure this whole feature is written to avoid, so it is logged and the
  // caller is told rather than shown a confident blank.
  for (const [name, result] of [
    ["subscribers", subscriberResult],
    ["companies", companyResult],
    ["areas", areaResult],
    ["members", memberResult],
  ] as const) {
    if (result.error) {
      log.error(
        { event: "site_audience_read_failed", source: "getSiteAudience", code: result.error.code, detail: name },
        result.error,
      );
      throw new Error("Unable to load who is notified about this work location.");
    }
  }

  const subscriberRows = subscriberResult.data;
  const companyRows = companyResult.data;
  const areaRows = areaResult.data;
  const memberRows = memberResult.data;

  const subscribers: SiteSubscriber[] = ((subscriberRows ?? []) as unknown as SubscriberRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    name: personName(row.users),
    areaId: row.site_area_id,
    areaName: row.site_areas?.name ?? null,
  }));

  // Alguém pode ouvir o local inteiro *e* estar na lista de um setor, por isso
  // a candidatura é por pessoa e não por linha: quem já lá está de alguma
  // forma não volta a aparecer na lista de acrescentar.
  const already = new Set(subscribers.map((row) => row.userId));
  type MemberRow = { user_id: string; users: { display_name: string | null; name: string | null } | null };
  const candidates = ((memberRows ?? []) as unknown as MemberRow[])
    .filter((row) => !already.has(row.user_id))
    .map((row) => ({ userId: row.user_id, name: personName(row.users) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  type CompanyRow = { company_id: string; company_name: string; subscriber_count: number };
  const companies = ((companyRows ?? []) as CompanyRow[])
    // A própria empresa sai daqui: já está acima, com nomes. Repeti-la como
    // contagem faria o ecrã parecer que há duas listas para a mesma gente.
    .filter((row) => row.company_id !== companyId)
    .map((row) => ({
      companyId: row.company_id,
      companyName: row.company_name,
      subscriberCount: Number(row.subscriber_count),
    }));

  type AreaRow = { id: string; name: string; is_default: boolean };
  const areas = ((areaRows ?? []) as AreaRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
  }));

  return { subscribers, companies, candidates, areas };
}
