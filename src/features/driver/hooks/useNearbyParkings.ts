import { useCallback, useEffect, useState } from 'react';
import type { Coordinate } from '../geo';
import type { ParkingLot } from '../mock';
import { fetchNearbyParkings } from '../services/driver';

type State = {
  status: 'loading' | 'success' | 'error';
  parkings: ParkingLot[];
  retry: () => void;
};

export function useNearbyParkings(
  center: Coordinate,
  accessToken: string,
): State {
  const [status, setStatus] = useState<State['status']>('loading');
  const [parkings, setParkings] = useState<ParkingLot[]>([]);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    void fetchNearbyParkings(center, accessToken)
      .then((rows) => {
        if (!active) return;
        setParkings(rows);
        setStatus('success');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [accessToken, center.latitude, center.longitude, retryKey]);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  return { status, parkings, retry };
}
