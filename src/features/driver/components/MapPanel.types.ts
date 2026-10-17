import type { ParkingLot } from '../mock';
import type { SearchDestination } from '../discovery';

export type MapPanelProps = {
  /** Dónde arranca centrado el mapa. */
  center: { latitude: number; longitude: number };
  /** Destino o ubicación marcados en el mapa; null en el inicio sin ubicación. */
  destination: SearchDestination | null;
  parkingLots: ParkingLot[];
  selectedParking: ParkingLot | undefined;
  onSelect: (parking: ParkingLot) => void;
  /**
   * El mapa quedó quieto en un centro nuevo. `cause` distingue si lo movió el
   * conductor o si se centró solo al tocar un pin.
   */
  onRegionChangeComplete: (
    coordinate: { latitude: number; longitude: number },
    cause: 'gesture' | 'pin',
  ) => void;
};
