import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/src/i18n/routing";
import { updateSession } from "@/src/infrastructure/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

/** Metadata routes Next serves from the root of `app`, outside `[locale]`. */
const ROOT_METADATA = new Set(["/manifest.webmanifest", "/apple-icon.png", "/icon.svg", "/robots.txt", "/sitemap.xml"]);

const protectedPrefixes = ["/dashboard", "/workforce", "/projects", "/settings"];
const authEntryRoutes = ["/login", "/register", "/forgot-password"];

function stripLocale(pathname: string): string {
  const [, maybeLocale, ...rest] = pathname.split("/");
  if ((routing.locales as readonly string[]).includes(maybeLocale)) return `/${rest.join("/")}` || "/";
  return pathname;
}

export async function proxy(request: NextRequest) {
  // API routes are not nested under app/[locale]/ and don't render pages —
  // the next-intl middleware would otherwise try to prefix/rewrite them for
  // locale resolution, which breaks route matching entirely (404s every
  // /api/* request). Skip both the locale and auth-redirect logic for them.
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();

  // Same reason, for the metadata routes Next serves from the root of `app`.
  // They are not pages and have no locale: let the i18n middleware near
  // `/manifest.webmanifest` and it rewrites it to `/en/manifest.webmanifest`,
  // which does not exist — the phone gets a 404, silently declines to install,
  // and the only symptom is an "Add to home screen" that makes a bookmark.
  if (ROOT_METADATA.has(request.nextUrl.pathname)) return NextResponse.next();

  const intlResponse = handleI18nRouting(request);
  const logicalPath = stripLocale(request.nextUrl.pathname);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const isProtected = protectedPrefixes.some((prefix) => logicalPath === prefix || logicalPath.startsWith(`${prefix}/`));
    if (isProtected) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
    return intlResponse;
  }

  return updateSession(request, intlResponse, logicalPath, { protectedPrefixes, authEntryRoutes });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
