/**
 * Structured logging (#27).
 *
 * One JSON object per line on stderr. Vercel captures whatever a function
 * writes to the console and makes it searchable, so this needs no vendor, no
 * key, and no network call in the request path — a logger that can itself fail
 * or add latency is a logger people switch off.
 *
 * The format matters more than the destination. `console.error("failed", err)`
 * produces a line nobody can filter on; `{"event":"action_failed","action":
 * "inviteNewCompany"}` can be counted, alerted on, and grouped.
 *
 * No `server-only` import: this is also used from instrumentation.ts, which
 * runs outside the normal module graph.
 */

export type LogLevel = "error" | "warn" | "info";

/**
 * Everything a log line may carry.
 *
 * Deliberately an allowlist rather than `Record<string, unknown>`. Logs get
 * shipped, retained and read by people who are not looking at this code, and
 * "just spread the object in" is how an email address, a token or a whole row
 * of payroll ends up in a log aggregator. Anything not named here does not
 * travel.
 */
export interface LogContext {
  /** What happened, in snake_case. The thing you group and alert on. */
  event: string;
  /** Server action, route or function the failure came from. */
  source?: string;
  /** Tenant, so a fault can be told from a fault affecting one customer. */
  companyId?: string;
  /** Who hit it. An id, never a name or an email. */
  userId?: string;
  route?: string;
  method?: string;
  /** Database or provider error code, e.g. 23505, 535. */
  code?: string;
  /** Free text, but only ever text we wrote — never a user's input. */
  detail?: string;
  durationMs?: number;
}

interface LogLine extends LogContext {
  level: LogLevel;
  timestamp: string;
  message?: string;
  stack?: string;
  errorName?: string;
}

/**
 * Pulls the useful parts out of anything that was thrown.
 *
 * `catch` gives you `unknown`, and half the time it is not an Error: Supabase
 * hands back a plain object, a rejected fetch can be a string. The SMTP episode
 * that opened this issue surfaced as `{}` precisely because nobody unwrapped it.
 */
function describe(error: unknown): Pick<LogLine, "message" | "stack" | "errorName" | "code"> {
  if (error instanceof Error) {
    const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    return {
      errorName: error.name,
      message: error.message,
      stack: error.stack,
      code: code || undefined,
    };
  }
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message = typeof record.message === "string" ? record.message : JSON.stringify(record);
    return {
      errorName: "NonError",
      // An empty object stringifies to "{}", which is exactly the message the
      // user saw during the SMTP failure. Say so rather than logging it bare.
      message: message === "{}" ? "Empty error object — the provider returned no body" : message,
      code: typeof record.code === "string" || typeof record.code === "number" ? String(record.code) : undefined,
    };
  }
  return { errorName: "NonError", message: String(error) };
}

function emit(level: LogLevel, context: LogContext, error?: unknown): void {
  const line: LogLine = {
    level,
    timestamp: new Date().toISOString(),
    ...context,
    ...(error === undefined ? {} : describe(error)),
  };

  // Single line, so a log viewer that splits on newlines keeps it whole.
  const serialised = JSON.stringify(line);
  if (level === "error") console.error(serialised);
  else if (level === "warn") console.warn(serialised);
  else console.info(serialised);
}

export const log = {
  /** Something broke. Always pass the caught value — that is where the code is. */
  error(context: LogContext, error?: unknown): void {
    emit("error", context, error);
  },
  /**
   * Degraded but not a defect: a cache miss, a slow upstream, a retry that
   * worked. Note what does *not* belong here — anything a customer can see is
   * an error, whether or not it took the page down. The team's alert rule
   * subscribes to `error` and `critical`, so `warn` is a level nobody reads.
   */
  warn(context: LogContext, error?: unknown): void {
    emit("warn", context, error);
  },
  info(context: LogContext): void {
    emit("info", context);
  },
};

/**
 * Logs a failure and returns the key the user should see.
 *
 * The pattern this replaces is returning `error.message` straight to the
 * screen, which is how `535 5.7.8 Authentication failed` and `{}` both ended up
 * in front of a customer. The detail belongs in the log; the user gets
 * something they can act on.
 */
export function logAndFallback<T extends string>(context: LogContext, error: unknown, userMessage: T): T {
  log.error(context, error);
  return userMessage;
}
