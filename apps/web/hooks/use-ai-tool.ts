"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/shared/i18n/provider";

/** Ephemeral component state only: no query cache, storage, or retained transcript. */
export function useAiTool<T>(url: string) {
  const { t } = useI18n();
  const [result, setResult] = useState<T | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  function clear() {
    controller.current?.abort();
    controller.current = null;
    setResult(null);
    setPending(false);
    setError("");
  }
  async function run(input: object): Promise<T | null> {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    setPending(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: request.signal,
      });
      const body = await response.json();
      if (request.signal.aborted) return null;
      if (!response.ok) {
        setError(
          response.status === 401
            ? t("ai.error.unauthenticated")
            : response.status === 403
              ? t("ai.tools.forbidden")
              : response.status === 429
                ? t("ai.error.rateLimited", {
                    seconds: Number(body.retryAfterSeconds) || 60,
                  })
                : t("ai.tools.failed"),
        );
        return null;
      }
      setResult(body as T);
      return body as T;
    } catch {
      if (!request.signal.aborted) setError(t("ai.tools.failed"));
      return null;
    } finally {
      if (!request.signal.aborted) setPending(false);
    }
  }
  return { result, pending, error, run, clear };
}
