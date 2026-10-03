import { useCallback, useEffect, useState } from 'react';
import type { ParkingLot } from '../mock';
import { fetchParkingDetail } from '../services/driver';

export function useParkingDetail(parkingId: string, accessToken: string) {
  const [parking, setParking] = useState<ParkingLot | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    void fetchParkingDetail(parkingId, accessToken)
      .then((row) => {
        if (!active) return;
        setParking(row);
        setStatus('success');
      })
      .catch(() => {
        if (!active) return;
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [accessToken, parkingId, retryKey]);

  const retry = useCallback(() => {
    setRetryKey((current) => current + 1);
  }, []);

  return { parking, status, retry };
}
