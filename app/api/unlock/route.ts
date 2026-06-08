import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";

// Server-only: never prefixed with NEXT_PUBLIC_, so it is not bundled into the
// client. The password is compared here, on the server, and never sent to the
// browser.
const PASSWORD = process.env.TIMER_PASSWORD;

const COOKIE = "pf_unlocked";
const TOKEN = "1";
const MAX_AGE = 60 * 60 * 8; // 8 hours

// Constant-time comparison so we don't leak length/contents via timing.
function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Lets the client ask "am I already unlocked?" on load — the cookie is
// httpOnly, so JS can't read it directly.
export async function GET() {
  const store = await cookies();
  return NextResponse.json({ unlocked: store.get(COOKIE)?.value === TOKEN });
}

export async function POST(request: Request) {
  if (!PASSWORD) {
    return NextResponse.json(
      { unlocked: false, error: "Server is missing TIMER_PASSWORD." },
      { status: 500 },
    );
  }

  let provided = "";
  try {
    const body = await request.json();
    if (typeof body?.password === "string") provided = body.password;
  } catch {
    // Malformed body — treat as an empty/incorrect password.
  }

  if (!matches(provided, PASSWORD)) {
    return NextResponse.json({ unlocked: false }, { status: 401 });
  }

  const store = await cookies();
  store.set(COOKIE, TOKEN, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });

  return NextResponse.json({ unlocked: true });
}
