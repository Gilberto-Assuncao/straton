import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthLayout from "@/components/auth/AuthLayout";
import AcceptCompanyInvite from "@/components/companies/AcceptCompanyInvite";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("companyInvites");
  return { title: t("pageTitle") };
}

/**
 * Where a company that is not on STRATON yet arrives from an invitation.
 *
 * Uses the auth layout rather than the dashboard shell: whoever lands here has
 * just set a password and belongs to no company at all, so there is no sidebar
 * to put them in.
 */
export default async function AcceptCompanyInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Read here rather than from `window` in the component: the token is a query
  // parameter, so the server has it, and pulling it out of an effect is what
  // keeps the first render from being a throwaway.
  const { token } = await searchParams;

  return (
    <AuthLayout>
      <AcceptCompanyInvite token={token ?? null} />
    </AuthLayout>
  );
}
