import { useCallback, useState } from 'react';
import type { SearchDestination } from '../discovery';
import {
  requestCurrentLocation,
  type LocationIssue,
} from '../services/location';

type CurrentLocationState = {
  pending: boolean;
  issue: LocationIssue | null;
  request: () => Promise<SearchDestination | null>;
  clearIssue: () => void;
};

export function useCurrentLocation(): CurrentLocationState {
  const [pending, setPending] = useState(false);
  const [issue, setIssue] = useState<LocationIssue | null>(null);

  const request = useCallback(async () => {
    setPending(true);
    setIssue(null);
    try {
      const result = await requestCurrentLocation();
      setIssue(result.issue);
      return result.destination;
    } finally {
      setPending(false);
    }
  }, []);

  const clearIssue = useCallback(() => {
    setIssue(null);
  }, []);

  return { pending, issue, request, clearIssue };
}
