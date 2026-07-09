import { SignJWT, jwtVerify, type JWTPayload } from "jose";

/**
 * Single shared cookie name, imported by middleware.ts and both auth route
 * handlers so there's never a mismatch between what's set and what's read.
 */
export const AUTH_COOKIE = "token";

const SESSION_DURATION = "24h";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Generate one with: " +
        `openssl rand -base64 32`
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Minimal session payload. This is a single-operator dashboard (no user
 * table in the backend), so the session just proves "the person who knows
 * the dashboard password is logged in" — there's no per-user identity to
 * carry beyond that. Extend this if that assumption ever changes.
 */
export interface SessionPayload extends JWTPayload {
  authenticated: true;
}

export async function createSessionToken(): Promise<string> {
  const secretKey = getSecretKey();

  return new SignJWT({ authenticated: true } satisfies Omit<
    SessionPayload,
    keyof JWTPayload
  >)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(secretKey);
}

/**
 * Verifies a session token. Returns the payload on success, or null on any
 * failure (expired, malformed, wrong signature) — callers should treat null
 * as "not authenticated" and redirect to /login, not throw.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecretKey();

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    if (payload.authenticated !== true) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}
