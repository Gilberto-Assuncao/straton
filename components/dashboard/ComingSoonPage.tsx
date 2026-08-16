import PageHeader from "./PageHeader";

export default function ComingSoonPage({ title }: { title: string }) { return <section aria-labelledby="coming-soon-heading"><PageHeader headingId="coming-soon-heading" eyebrow="STRATON" title={title} description="This module is currently in development and will be available in a future release." /><div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-surface px-6 py-16 text-center"><p className="text-sm font-medium text-ink-muted">No functionality is available in this module yet.</p></div></section>; }
