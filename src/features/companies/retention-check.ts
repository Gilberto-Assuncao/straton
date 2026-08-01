// Retention obligation check (art. 30bis/30ter) — deep link into the official
// government portal.
//
// Belgium requires whoever contracts construction, security or meat-sector work
// to check whether the subcontractor has fiscal or social debts before paying.
// If there are debts the contractor must withhold part of the invoice (15%
// fiscal, 35% social) and pay it to the State directly; failing to withhold
// makes the contractor liable for the subcontractor's debt.
//
// There is an official API (billRetainment, on the social security API
// Gateway), but access requires ONSS approval and a signed convention, plus
// OAuth with managed tokens and certificates. That is an administrative process
// measured in months, and the payoff for a first version does not justify it.
//
// The portal accepts the enterprise number directly in the URL, arriving with
// the field already filled. The user completes the CAPTCHA and clicks Vérifier,
// staying inside the official government flow the whole time. Nothing here
// attempts to bypass that validation — the point is only to save the user
// copying a number by hand.
//
// See #37 for the eventual API integration.

const PORTAL_BASE = "https://www.checkobligationderetenue.be/result";

/**
 * Belgian enterprise numbers are ten digits, shown as NNNN.NNN.NNN. The portal
 * expects that dotted form, while the register and our own records may hold it
 * either way.
 */
export function formatEnterpriseNumber(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  // A VAT number written as BE0824054194 carries the same ten digits; anything
  // shorter is padded, since older numbers are published without the leading
  // zero.
  if (digits.length < 9 || digits.length > 10) return null;
  const padded = digits.padStart(10, "0");
  return `${padded.slice(0, 4)}.${padded.slice(4, 7)}.${padded.slice(7)}`;
}

/**
 * Returns null when the number is unusable, so callers can hide the action
 * instead of offering a link that lands on an error.
 */
export function retentionCheckUrl(enterpriseNumber: string | null | undefined): string | null {
  if (!enterpriseNumber) return null;
  const formatted = formatEnterpriseNumber(enterpriseNumber);
  return formatted ? `${PORTAL_BASE}/${formatted}` : null;
}
