import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_API_URL ?? "http://localhost:8000";

const BACKEND_API_KEY =
  process.env.BACKEND_API_KEY ?? "";

function buildBackendUrl(
  request: NextRequest,
  path: string[],
) {
  const url = new URL(
    "/" + path.join("/"),
    BACKEND_URL.endsWith("/")
      ? BACKEND_URL
      : `${BACKEND_URL}/`,
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url;
}

async function proxyRequest(
  request: NextRequest,
  path: string[],
) {
  const url = buildBackendUrl(request, path);

  const headers = new Headers();

  headers.set(
    "Accept",
    request.headers.get("accept") ?? "application/json",
  );

  const contentType =
    request.headers.get("content-type");

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (BACKEND_API_KEY) {
    headers.set("X-API-Key", BACKEND_API_KEY);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };

  if (
    request.method !== "GET" &&
    request.method !== "HEAD"
  ) {
    init.body = await request.text();
  }

  try {
    const response = await fetch(url, init);

    const responseHeaders = new Headers();

    response.headers.forEach((value, key) => {
      if (
        key.toLowerCase() === "content-length" ||
        key.toLowerCase() === "content-encoding"
      ) {
        return;
      }

      responseHeaders.set(key, value);
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {

    console.error(
      "[Backend Proxy]",
      error,
    );

    return NextResponse.json(
      {
        error: "Backend unavailable",
        message:
          "Unable to connect to the FastAPI backend.",
        backend: BACKEND_URL,
      },
      {
        status: 502,
      },
    );

  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { path: string[] } },
) {
  return proxyRequest(request, params.path);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS",
    },
  });
}

/**
 * Use the Node.js runtime because this proxy forwards arbitrary HTTP
 * requests and streams backend responses. This also keeps behavior
 * consistent between local development, Railway and Vercel.
 */
export const runtime = "nodejs";

/**
 * Always execute dynamically so no API responses are cached by Next.js.
 */
export const dynamic = "force-dynamic";

/**
 * Maximum execution time (seconds).
 */
export const maxDuration = 60;

/**
 * Ensure every request reaches the backend instead of serving cached data.
 */
export const fetchCache = "force-no-store";
