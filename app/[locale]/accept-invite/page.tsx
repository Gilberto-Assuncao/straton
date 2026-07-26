import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthLayout from "@/components/auth/AuthLayout";
import AcceptInviteForm from "@/components/auth/AcceptInviteForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("pageAcceptInvite") };
}

export default function AcceptInvitePage() {
  return <AuthLayout><AcceptInviteForm /></AuthLayout>;
}
