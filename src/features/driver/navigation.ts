import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SearchDestination } from './discovery';

export type DiscoveryStackParamList = {
  DiscoveryHome: undefined;
  DestinationSearch: undefined;
  MapResults: {
    destination: SearchDestination;
  };
};

export type DriverTabParamList = {
  Explore: NavigatorScreenParams<DiscoveryStackParamList> | undefined;
  Reservations: undefined;
  Profile: undefined;
};
