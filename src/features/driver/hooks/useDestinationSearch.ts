import { useCallback, useEffect, useState } from 'react';
import type { Coordinate } from '../geo';
import type { SearchDestination } from '../discovery';
import type { ParkingLot } from '../mock';
import { searchDestinationSuggestions } from '../services/destinations';

type SearchStatus = 'idle' | 'loading' | 'success' | 'error';

type DestinationSearchState = {
  status: SearchStatus;
  places: SearchDestination[];
  results: SearchDestination[];
  parkings: ParkingLot[];
  retry: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;

export function useDestinationSearch(
  query: string,
  accessToken: string,
  coords?: Coordinate,
): DestinationSearchState {
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [places, setPlaces] = useState<SearchDestination[]>([]);
  const [results, setResults] = useState<SearchDestination[]>([]);
  const [parkings, setParkings] = useState<ParkingLot[]>([]);
  const [retryKey, setRetryKey] = useState(0);
  const latitude = coords?.latitude;
  const longitude = coords?.longitude;

  useEffect(() => {
    if (query.trim().length < 3) {
      setStatus('idle');
      setPlaces([]);
      setResults([]);
      setParkings([]);
      return;
    }

    let active = true;
    setStatus('loading');
    const timeout = setTimeout(() => {
      const point =
        latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : undefined;
      void searchDestinationSuggestions(query, accessToken, point)
        .then((suggestions) => {
          if (!active) return;
          setPlaces(suggestions.places);
          setResults(suggestions.addresses);
          setParkings(suggestions.parkings);
          setStatus('success');
        })
        .catch(() => {
          if (!active) return;
          setPlaces([]);
          setResults([]);
          setParkings([]);
          setStatus('error');
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, accessToken, latitude, longitude, retryKey]);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  return { status, places, results, parkings, retry };
}
