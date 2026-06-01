import { NextRequest, NextResponse } from "next/server";

/**
 * Optional username/password gate (HTTP Basic Auth).
 *
 * - If BASIC_AUTH_USER and BASIC_AUTH_PASS are both set, every route (pages and
 *   API) requires those credentials. The browser shows a native login prompt and
 *   remembers the credentials for the session — handy when you expose the app to
 *   a friend through a tunnel (cloudflared / ngrok).
 * - If either is unset, the gate is OFF (convenient for pure-local development).
 *
 * Basic Auth sends credentials base64-encoded (NOT encrypted), so only enable it
 * behind HTTPS. Tunnels and Vercel both provide HTTPS automatically.
 */
export function middleware(req: NextRequest) {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;

  // Gate disabled unless BOTH credentials are configured.
  if (!user || !pass) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6)); // "user:pass"
      const sep = decoded.indexOf(":");
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (safeEqual(u, user) && safeEqual(p, pass)) {
        return NextResponse.next();
      }
    } catch {
      /* fall through to 401 */
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="TravelScout", charset="UTF-8"',
    },
  });
}

/** Length-aware constant-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
