import type { Instrumentation } from "next";
import { log } from "@/src/infrastructure/observability/logger";

/**
 * Catches every unhandled server error (#27).
 *
 * Next calls this for anything thrown while rendering a server component,
 * running a route handler, or executing a server action. Before this file
 * existed, such an error produced a stack trace in a log line nobody was
 * watching and nothing else — which is how a broken password reset went
 * unnoticed until someone went digging in the Supabase auth logs.
 *
 * Lives at the repository root rather than under `src/`, because `app/` is at
 * the root: Next looks for it beside the app directory, not beside the source
 * folder.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest?: unknown }).digest)
      : undefined;

  log.error(
    {
      event: "unhandled_server_error",
      // The route *pattern*, not the resolved path: /dashboard/sites/[siteId]
      // groups a thousand broken sites into one alert instead of a thousand.
      route: context.routePath,
      method: request.method,
      // 'render' | 'route' | 'action' | 'proxy' — tells a crashed page apart
      // from a failed form submission without reading the stack.
      source: `${context.routeType}:${context.renderSource ?? "-"}`,
      detail: digest ? `digest ${digest}` : undefined,
    },
    error,
  );
};

/**
 * No `register()` export on purpose.
 *
 * It is where an APM SDK would be initialised, and there is deliberately none:
 * the whole point of this pass is that the errors are already being collected
 * by the platform, and what was missing was structure and a notification —
 * not another vendor in the request path.
 */
