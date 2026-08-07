import { getRequestConfig } from "next-intl/server";
import { hasLocale, IntlErrorCode, type IntlError } from "next-intl";
import { routing } from "./routing";
import { log } from "@/src/infrastructure/observability/logger";

/**
 * A missing translation used to be invisible (#27).
 *
 * next-intl's default behaviour is to print the key path and carry on. That is
 * the right call in production — a missing label must never take a page down —
 * but it means a mistake ships silently. On 2026-08-05 two menu entries went
 * out without their keys and the sidebar read "nav.agenda" for 70 minutes,
 * across 3 users, through a green build, typecheck, lint and CI.
 *
 * So: loud in development, logged in production. Same defect, found in seconds
 * instead of after deployment.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,

    onError(error: IntlError) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        // Throwing here is what turns "someone will notice eventually" into a
        // red screen the moment you open the page you just broke.
        if (process.env.NODE_ENV === "development") throw error;

        /**
         * Error level, not warning, and that is deliberate.
         *
         * A missing translation does not crash anything, so `warn` reads like
         * the honest classification. But the team's Vercel alert rule filters
         * on `level in ('error', 'critical')` — a warning is a line nobody is
         * subscribed to, which is precisely the state that let "nav.agenda"
         * sit in the sidebar for 70 minutes.
         *
         * It is a shipped defect visible to a customer. Whether it took the
         * page down is not the test.
         */
        log.error({ event: "missing_translation", source: "next-intl", detail: error.message });
        return;
      }

      // Anything else — a malformed ICU string, a bad interpolation — is a bug
      // in the message itself and worth an error rather than a warning.
      log.error({ event: "intl_error", source: "next-intl", code: error.code }, error);
    },

    /**
     * What the user sees when a key is missing in production.
     *
     * The raw key path, deliberately. It is ugly, and that is the point: it is
     * unmistakably a bug rather than a label someone chose, so whoever sees it
     * reports it. A prettified guess like "Agenda" would look intentional and
     * hide the fault.
     */
    getMessageFallback({ namespace, key }) {
      return namespace ? `${namespace}.${key}` : key;
    },
  };
});
