/**
 * Address text tidying for the geocoder, kept out of `server-only` so it can be
 * unit tested — the same split as `worked-hours-format.ts`.
 */

/**
 * Removes the Belgian box number, which no geocoder knows about.
 *
 * "Coppendries 3, bus 002, 1852, Beigem" finds nothing. Drop the "bus 002" and
 * the same address resolves. Flats and offices here are written this way as a
 * matter of course — "bus" in Dutch, "boîte" or "bte" in French — so leaving it
 * in means failing on a large share of urban addresses.
 *
 * Dropped only for the lookup. What the company typed stays stored and shown; a
 * box number matters for post, and post is not what this is for.
 */
export function withoutBoxNumber(query: string): string {
  return query
    // The word boundary after the keyword is not decoration: without it,
    // ", Beigem" matches as "b" + "eigem" and the town disappears. The length
    // cap keeps it to something that looks like a box number.
    .replace(/[,\s]+(?:bus|bte|bo[iî]te)\b\.?\s*[\w-]{1,6}\b/gi, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .trim();
}
