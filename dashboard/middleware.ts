import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_ROUTES = [
  "/login",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) =>
    pathname === route ||
    pathname.startsWith(`${route}/`)
  );
}

function isIgnoredRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/fonts")
  );
}

export async function middleware(
  request: NextRequest,
) {
  const { pathname } = request.nextUrl;

  if (isIgnoredRoute(pathname)) {
    return NextResponse.next();
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL(
      "/login",
      request.url,
    );

    loginUrl.searchParams.set(
      "next",
      pathname,
    );

    return NextResponse.redirect(loginUrl);
  }

  const session =
    await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL(
      "/login",
      request.url,
    );

    loginUrl.searchParams.set(
      "next",
      pathname,
    );

    const response =
      NextResponse.redirect(loginUrl);

    response.cookies.set({
      name: AUTH_COOKIE,
      value: "",
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
