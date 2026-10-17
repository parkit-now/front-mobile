import { useEffect, useState } from 'react';
import { isWithinCoverage, type SearchDestination } from '../discovery';
import { getLocationIfGranted } from '../services/location';

type StartLocationState = {
  /** false mientras todavía no se sabe si hay una ubicación disponible. */
  checked: boolean;
  location: SearchDestination | null;
};

/**
 * Ubicación del conductor para arrancar el descubrimiento SIN pedir permiso:
 * sólo existe si ya lo otorgó antes y está dentro de la cobertura. Lejos de
 * ella se arranca en el centro de CABA, porque abrir sobre su posición
 * mostraría una zona sin cocheras.
 */
export function useStartLocation(): StartLocationState {
  const [state, setState] = useState<StartLocationState>({
    checked: false,
    location: null,
  });

  useEffect(() => {
    let active = true;
    void getLocationIfGranted().then((location) => {
      if (!active) return;
      setState({
        checked: true,
        location:
          location && isWithinCoverage(location.coordinate) ? location : null,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
