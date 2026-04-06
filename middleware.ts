import createMiddleware from "next-intl/middleware";
import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["ru", "kk", "en"],
  defaultLocale: "ru",
});

export async function middleware(request: NextRequest) {
  // Update Supabase auth session
  const response = await updateSession(request);

  // Apply i18n routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
