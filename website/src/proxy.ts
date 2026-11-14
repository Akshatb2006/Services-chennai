import { NextResponse, type NextRequest } from "next/server";
import { serviceSlugs } from "@/config/service-slugs";

const known = new Set<string>(serviceSlugs);

/** Return a real 404 (not a soft 200) for unknown service URLs. Scoped to /services/* only. */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];
  if (slug && !known.has(slug)) {
    return NextResponse.rewrite(new URL("/404", request.url), { status: 404 });
  }
  return NextResponse.next();
}

export const config = { matcher: "/services/:slug" };
