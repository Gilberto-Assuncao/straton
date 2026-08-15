import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ChainSide, CompanyNetwork as Network, NetworkCompany } from "@/src/features/partners/network";

const card = "rounded-2xl border border-white/10 bg-[#161A34] p-5 sm:p-6";

const statusTone: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-300",
  active: "bg-[#22C55E]/10 text-[#4ADE80]",
  rejected: "bg-red-400/10 text-red-300",
};

async function CompanyCard({ company }: { company: NetworkCompany }) {
  const t = await getTranslations("network");

  return (
    <li className="rounded-xl border border-white/10 bg-[#111C33] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#E5E7EB]">{company.name}</p>
          <p className="mt-1 text-xs text-[#6B7280]">
            {[t(`type_${company.relationshipType}` as "type_client"), company.vatNumber].filter(Boolean).join(" · ")}
          </p>
        </div>
        <span className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold ${statusTone[company.relationshipStatus] ?? statusTone.pending}`}>
          {t(`status_${company.relationshipStatus}` as "status_active")}
        </span>
      </div>

      {company.locations.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {company.locations.map((location) => (
            <li key={location.id}>
              <span
                className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs ${
                  location.yoursTheirs ? "bg-[#22C55E]/10 text-[#4ADE80]" : "bg-white/10 text-[#9CA3AF]"
                }`}
                title={location.yoursTheirs ? t("projectYours") : t("projectTheirs")}
              >
                {location.name}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[#6B7280]">{t("noSharedProjects")}</p>
      )}

      {company.peopleOnYourLocations > 0 ? (
        // The number that answers the chain-liability question: how many of
        // their people are on work you are responsible for.
        <p className="mt-3 text-xs text-[#D1D5DB]">
          {t("peopleOnYourLocations", { count: company.peopleOnYourLocations })}
        </p>
      ) : null}
    </li>
  );
}

async function Band({ side, companies }: { side: ChainSide; companies: NetworkCompany[] }) {
  const t = await getTranslations("network");
  if (companies.length === 0) return null;

  return (
    <section className={card}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{t(`band_${side}` as "band_upstream")}</h2>
      <p className="mt-1 text-sm text-[#9CA3AF]">{t(`bandHint_${side}` as "bandHint_upstream")}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {companies.map((company) => (
          <CompanyCard key={`${company.id}-${company.relationshipType}`} company={company} />
        ))}
      </ul>
    </section>
  );
}

export default async function CompanyNetwork({ network }: { network: Network }) {
  const t = await getTranslations("network");

  if (network.companies.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-[#6B7280]">
        {t("empty")}
      </p>
    );
  }

  const upstream = network.companies.filter((company) => company.side === "upstream");
  const downstream = network.companies.filter((company) => company.side === "downstream");
  const lateral = network.companies.filter((company) => company.side === "lateral");

  return (
    <div className="grid gap-5">
      <Band side="upstream" companies={upstream} />

      <div className="rounded-2xl border border-[#22C55E]/40 bg-[#161A34] px-5 py-4 text-center">
        <p className="text-xs uppercase tracking-wide text-[#6B7280]">{t("youAreHere")}</p>
        <p className="mt-1 text-lg font-semibold text-[#E5E7EB]">{network.companyName}</p>
      </div>

      <Band side="downstream" companies={downstream} />
      <Band side="lateral" companies={lateral} />

      {/*
        Said plainly rather than implied by an empty diagram: a company only
        ever sees the two ends of its own relationships, so the chain does not
        continue on this screen even when it continues in reality.
      */}
      <p className="rounded-xl border border-white/10 px-4 py-3 text-xs text-[#6B7280]">
        {t("depthNote")}{" "}
        <Link href="/dashboard/sites" className="font-semibold text-[#9CA3AF] underline hover:text-[#E5E7EB]">
          {t("depthNoteLink")}
        </Link>
      </p>
    </div>
  );
}
