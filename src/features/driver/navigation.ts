import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SearchDestination } from './discovery';
import type { DiscoveredParkingLot } from './geo';

export type DiscoveryStackParamList = {
  DiscoveryHome: undefined;
  DestinationSearch: undefined;
  MapResults: {
    destination: SearchDestination;
  };
  ParkingDetails: {
    parking: DiscoveredParkingLot;
  };
};

export type DriverTabParamList = {
  Explore: NavigatorScreenParams<DiscoveryStackParamList> | undefined;
  Reservations: undefined;
  Profile: undefined;
};
