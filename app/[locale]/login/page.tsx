import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("pageSignIn") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  // The callback route sends back one of two values. `configuration` used to
  // arrive and be dropped: the redirect happened, the login page rendered, and
  // nothing said why the sign-in had failed.
  const callbackError =
    params.error === "callback" ? "errCallbackFailed" : params.error === "configuration" ? "errNotConfigured" : undefined;

  return <AuthLayout><LoginForm next={params.next} callbackError={callbackError} /></AuthLayout>;
}
