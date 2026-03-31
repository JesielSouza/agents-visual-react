import { useEffect, useState } from 'react';
import { apiUrl } from '../utils/api';

export function useLLMStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const res = await fetch(apiUrl('/api/llm/status'));
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus((prev) => prev || {
            available_llms: [],
            primary_llm: null,
            fallback_chain: [],
            last_fallback: null,
            total_calls: 0,
            calls_by_llm: {},
            startup_error: 'Bridge offline',
          });
        }
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return status;
}
