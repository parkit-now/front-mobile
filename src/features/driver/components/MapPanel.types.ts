import type { ParkingLot } from '../mock';

export type MapPanelProps = {
  parkingLots: ParkingLot[];
  selectedParking: ParkingLot | undefined;
  onSelect: (parking: ParkingLot) => void;
  onReserve: (parking: ParkingLot) => void;
};
