import type { ParkingLot } from '../mock';
import type { SearchDestination } from '../discovery';

export type MapPanelProps = {
  destination: SearchDestination;
  parkingLots: ParkingLot[];
  selectedParking: ParkingLot | undefined;
  onSelect: (parking: ParkingLot) => void;
  onMapMoved: () => void;
};
