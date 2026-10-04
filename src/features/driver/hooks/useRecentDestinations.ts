import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import type { SearchDestination } from '../discovery';
import {
  loadRecentDestinations,
  saveRecentDestination,
} from '../recentDestinations';

type RecentDestinationsState = {
  recents: SearchDestination[];
  remember: (destination: SearchDestination) => void;
};

/** Últimos destinos elegidos (máx. 5), guardados en el dispositivo. */
export function useRecentDestinations(): RecentDestinationsState {
  const [recents, setRecents] = useState<SearchDestination[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadRecentDestinations().then((stored) => {
        if (active) setRecents(stored);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const remember = useCallback((destination: SearchDestination) => {
    void saveRecentDestination(destination).then(setRecents);
  }, []);

  return { recents, remember };
}
