import { useCallback, useEffect, useState } from 'react';
import type { SearchDestination } from '../discovery';
import { searchDestinationSuggestions } from '../services/destinations';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

type DestinationSearchState = {
  status: SearchStatus;
  results: SearchDestination[];
  retry: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function useDestinationSearch(query: string): DestinationSearchState {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<SearchDestination[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (query.trim().length < 3) {
      setStatus('idle');
      setResults([]);
      return;
    }

    let active = true;
    setStatus('loading');
    const timeout = setTimeout(() => {
      void searchDestinationSuggestions(query)
        .then((suggestions) => {
          if (!active) return;
          setResults(suggestions);
          setStatus('success');
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, retryKey]);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  return { status, results, retry };
}
