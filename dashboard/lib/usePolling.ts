"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "./api";

interface PollState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  connected: boolean;
}

/**
 * Re-fetches on an interval. The dashboard's data changes as the poller in
 * main.py discovers new mail, so this is a deliberate design choice (mirrors
 * the backend's own polling model) rather than a websocket — one less moving
 * part for a personal tool.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs = 5000): PollState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const result = await fetcherRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
          setConnected(true);
        }
      } catch (err) {
        if (!cancelled) {
          setConnected(false);
          setError(
            err instanceof ApiError
              ? `Backend returned ${err.status}: ${err.message}`
              : "Cannot reach the API. Is uvicorn running and NEXT_PUBLIC_API_BASE_URL correct?"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(tick, intervalMs);
        }
      }
    }

    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return { data, error, loading, connected };
}
