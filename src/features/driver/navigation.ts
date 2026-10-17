import type { NavigatorScreenParams } from '@react-navigation/native';
import type { SearchDestination } from './discovery';
import type { ParkingLot } from './mock';

export type DiscoveryStackParamList = {
  DiscoveryHome: undefined;
  DestinationSearch: undefined;
  /** Sin destino el mapa se centra en el conductor o en el centro de CABA. */
  MapResults: { destination?: SearchDestination } | undefined;
  ParkingDetails: {
    parking: ParkingLot;
  };
};

/** Pantalla de una reserva: pago, espera de confirmación y estado final. */
export type ReservationDetailParams = {
  reservationId: string;
  /** Cuándo volvió el conductor del checkout (deep link): arranca la espera. */
  returnedAt?: number;
};

export type DriverRootParamList = {
  Tabs: NavigatorScreenParams<DriverTabParamList> | undefined;
  ReservationDetail: ReservationDetailParams;
};

export type DriverTabParamList = {
  Explore: NavigatorScreenParams<DiscoveryStackParamList> | undefined;
  Reservations: undefined;
  Profile: undefined;
};
