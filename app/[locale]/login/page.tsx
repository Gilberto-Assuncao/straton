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
  return <AuthLayout><LoginForm next={params.next} callbackError={params.error === "callback"} /></AuthLayout>;
}
