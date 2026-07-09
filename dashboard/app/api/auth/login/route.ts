import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  createSessionToken,
  verifySessionToken,
} from "@/lib/auth";

const BACKEND_URL =
  process.env.BACKEND_API_URL ??
  "http://localhost:8000";

interface LoginRequest {
  apiKey: string;
}

interface BackendReady {
  database: string;
  database_error: string | null;
  gmail: {
    connected: boolean;
    last_error: string | null;
    last_success_at: string | null;
    last_attempt_at: string | null;
    consecutive_failures: number;
  };
}

async function validateBackend(
  apiKey: string,
): Promise<BackendReady> {
  const response = await fetch(
    `${BACKEND_URL}/ready`,
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "X-API-Key": apiKey,
      },
    },
  );

  if (response.status === 401) {
    throw new Error("INVALID_API_KEY");
  }

  if (!response.ok) {
    throw new Error(
      `BACKEND_${response.status}`,
    );
  }

  return response.json();
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as LoginRequest;

    const apiKey =
      body.apiKey?.trim() ?? "";

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "API key is required.",
        },
        {
          status: 400,
        },
      );
    }

    const backend =
      await validateBackend(apiKey);

    if (
      backend.database !== "ok" &&
      backend.database !== "healthy"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            backend.database_error ??
            "Backend is not ready.",
        },
        {
          status: 503,
        },
      );
    }

    const token =
      await createSessionToken();

    const response = NextResponse.json(
      {
        success: true,
        authenticated: true,
        backend: {
          database: backend.database,
          gmail_connected:
            backend.gmail.connected,
        },
      },
      {
        status: 200,
      },
    );

    response.cookies.set({
      name: AUTH_COOKIE,
      value: token,
      httpOnly: true,
      secure:
        process.env.NODE_ENV ===
        "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );

    response.headers.set(
      "Pragma",
      "no-cache",
    );

    response.headers.set(
      "Expires",
      "0",
    );

    return response;

  } catch (error) {

    if (
      error instanceof Error &&
      error.message === "INVALID_API_KEY"
    ) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Invalid API key.",
        },
        {
          status: 401,
        },
      );
    }

    console.error(
      "[AUTH LOGIN]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected authentication error.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  const token =
    request.cookies.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const payload =
      await verifySessionToken(token);

    return NextResponse.json(
      {
        authenticated:
          payload !== null,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json(
    {
      success: true,
      authenticated: false,
    },
    {
      status: 200,
    },
  );

  response.cookies.set({
    name: AUTH_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });

  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate",
  );

  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  return response;
}
