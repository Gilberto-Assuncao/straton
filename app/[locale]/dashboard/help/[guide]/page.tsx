import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HelpGuideView from "@/components/help/HelpGuideView";
import { HELP_GUIDES, resolveHelpGuide, type HelpGuideId } from "@/src/content/help";

interface Params {
  params: Promise<{ locale: string; guide: string }>;
}

function known(id: string): id is HelpGuideId {
  return (HELP_GUIDES as readonly string[]).includes(id);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, guide } = await params;
  if (!known(guide)) return { title: "Help" };
  return { title: resolveHelpGuide(guide, locale).guide.title };
}

export default async function HelpGuidePage({ params }: Params) {
  const { locale, guide } = await params;
  // A guide id that does not exist is a wrong URL, not an empty page. Rendering
  // a blank article would look like a guide nobody had written yet.
  if (!known(guide)) notFound();
  return <HelpGuideView resolution={resolveHelpGuide(guide, locale)} />;
}
