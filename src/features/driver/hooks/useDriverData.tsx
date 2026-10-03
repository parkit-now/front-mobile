import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DRIVER_VEHICLES, type Booking, type ParkingLot } from '../mock';
import {
  cancelReservation as cancelReservationRequest,
  createReservation as createReservationRequest,
  listReservations,
} from '../services/reservations';
import {
  addVehicle as addVehicleToList,
  removeVehicle as removeVehicleFromList,
  setPrimaryVehicle,
  updateVehicle as updateVehicleInList,
  type DriverVehicle,
  type VehicleDraft,
} from '../vehicles';

type DriverDataContextValue = {
  accessToken: string;
  bookings: Booking[];
  bookingsStatus: 'loading' | 'success' | 'error';
  refreshBookings: () => Promise<void>;
  vehicles: DriverVehicle[];
  /** Crea la reserva en el backend; lanza ApiError si falla. */
  createReservation: (input: {
    id: string;
    parking: ParkingLot;
    vehicle: DriverVehicle;
    entryAt: string;
    exitAt: string;
  }) => Promise<Booking>;
  /** Cancela en el backend; lanza ApiError si falla. */
  cancelReservation: (bookingId: string) => Promise<Booking>;
  addVehicle: (draft: VehicleDraft, makePrimary: boolean) => void;
  updateVehicle: (id: string, draft: VehicleDraft) => void;
  removeVehicle: (id: string) => void;
  makePrimaryVehicle: (id: string) => void;
};

const DriverDataContext = createContext<DriverDataContextValue | null>(null);

export function DriverDataProvider({
  accessToken,
  children,
}: {
  accessToken: string;
  children: ReactNode;
}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsStatus, setBookingsStatus] = useState<
    'loading' | 'success' | 'error'
  >('loading');
  const [vehicles, setVehicles] = useState<DriverVehicle[]>(DRIVER_VEHICLES);

  const refreshBookings = useCallback(async () => {
    setBookingsStatus((current) =>
      current === 'success' ? current : 'loading',
    );
    try {
      setBookings(await listReservations(accessToken));
      setBookingsStatus('success');
    } catch {
      setBookingsStatus('error');
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshBookings();
  }, [refreshBookings]);

  const upsertBooking = useCallback((booking: Booking) => {
    setBookings((current) => [
      booking,
      ...current.filter((item) => item.id !== booking.id),
    ]);
  }, []);

  const createReservation = useCallback(
    async (input: {
      id: string;
      parking: ParkingLot;
      vehicle: DriverVehicle;
      entryAt: string;
      exitAt: string;
    }) => {
      const booking = await createReservationRequest(
        {
          id: input.id,
          parkingId: input.parking.id,
          vehiclePlate: input.vehicle.plate,
          entryAt: input.entryAt,
          exitAt: input.exitAt,
        },
        accessToken,
      );
      upsertBooking(booking);
      return booking;
    },
    [accessToken, upsertBooking],
  );

  const cancelReservation = useCallback(
    async (bookingId: string) => {
      const booking = await cancelReservationRequest(bookingId, accessToken);
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? booking : item)),
      );
      return booking;
    },
    [accessToken],
  );

  const addVehicle = useCallback(
    (draft: VehicleDraft, makePrimary: boolean) => {
      setVehicles((current) =>
        addVehicleToList(current, draft, {
          id: `vehicle-${Date.now()}`,
          makePrimary,
        }),
      );
    },
    [],
  );

  const updateVehicle = useCallback((id: string, draft: VehicleDraft) => {
    setVehicles((current) => updateVehicleInList(current, id, draft));
  }, []);

  const removeVehicle = useCallback((id: string) => {
    setVehicles((current) => removeVehicleFromList(current, id));
  }, []);

  const makePrimaryVehicle = useCallback((id: string) => {
    setVehicles((current) => setPrimaryVehicle(current, id));
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      bookings,
      bookingsStatus,
      refreshBookings,
      vehicles,
      createReservation,
      cancelReservation,
      addVehicle,
      updateVehicle,
      removeVehicle,
      makePrimaryVehicle,
    }),
    [
      accessToken,
      bookings,
      bookingsStatus,
      refreshBookings,
      vehicles,
      createReservation,
      cancelReservation,
      addVehicle,
      updateVehicle,
      removeVehicle,
      makePrimaryVehicle,
    ],
  );

  return (
    <DriverDataContext.Provider value={value}>
      {children}
    </DriverDataContext.Provider>
  );
}

export function useDriverData(): DriverDataContextValue {
  const context = useContext(DriverDataContext);
  if (!context) {
    throw new Error('useDriverData debe usarse dentro de DriverDataProvider');
  }
  return context;
}
