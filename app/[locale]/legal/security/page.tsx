import type { Metadata } from "next";
import LegalDocumentView from "@/components/legal/LegalDocumentView";
import { resolveLegalDocument } from "@/src/content/legal";

interface Params {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  // The document's own title, in the language the reader is actually being
  // served — not a translated label that could name a language the page is not
  // written in.
  return { title: resolveLegalDocument("security", locale).document.title };
}

export default async function SecurityPage({ params }: Params) {
  const { locale } = await params;
  return <LegalDocumentView resolution={resolveLegalDocument("security", locale)} />;
}
