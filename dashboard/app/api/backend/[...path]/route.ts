/**
 * Every dashboard request goes through here, never directly from the
 * browser to FastAPI. This keeps BACKEND_API_KEY server-side only — it's
 * read from process.env here (no NEXT_PUBLIC_ prefix), so it's never bundled
 * into client JS or visible in browser dev tools.
 */
import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY || "";

async function proxy(req: NextRequest, path: string[]) {
  const targetPath = "/" + path.join("/");
  const search = req.nextUrl.search;
  const url = `${BACKEND_URL}${targetPath}${search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      ...(BACKEND_KEY ? { "X-API-Key": BACKEND_KEY } : {}),
    },
    cache: "no-store",
  };

  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.text();
    if (body) init.body = body;
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Cannot reach backend at ${BACKEND_URL}. Is uvicorn running?` },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path);
}
