import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Booking, ParkingLot } from '../mock';
import {
  createReservation as createReservationRequest,
  listReservations,
} from '../services/reservations';
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle as updateVehicleRequest,
} from '../services/vehicles';
import type { DriverVehicle, VehicleDraft } from '../vehicles';

type LoadStatus = 'loading' | 'success' | 'error';

type DriverDataContextValue = {
  accessToken: string;
  bookings: Booking[];
  bookingsStatus: 'loading' | 'success' | 'error';
  refreshBookings: () => Promise<void>;
  vehicles: DriverVehicle[];
  vehiclesStatus: LoadStatus;
  refreshVehicles: () => Promise<void>;
  /** Crea la reserva en el backend; lanza ApiError si falla. */
  createReservation: (input: {
    id: string;
    parking: ParkingLot;
    vehicle: DriverVehicle;
    entryAt: string;
    exitAt: string;
  }) => Promise<Booking>;
  /** Alta o edición en el backend; lanza ApiError si falla. */
  saveVehicle: (input: {
    vehicle: DriverVehicle | null;
    draft: VehicleDraft;
    makePrimary: boolean;
  }) => Promise<void>;
  /** Baja en el backend; lanza ApiError si falla. */
  removeVehicle: (vehicleId: string) => Promise<void>;
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
  const [vehicles, setVehicles] = useState<DriverVehicle[]>([]);
  const [vehiclesStatus, setVehiclesStatus] = useState<LoadStatus>('loading');

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

  const refreshVehicles = useCallback(async () => {
    setVehiclesStatus((current) =>
      current === 'success' ? current : 'loading',
    );
    try {
      setVehicles(await listVehicles(accessToken));
      setVehiclesStatus('success');
    } catch {
      setVehiclesStatus('error');
    }
  }, [accessToken]);

  useEffect(() => {
    void refreshVehicles();
  }, [refreshVehicles]);

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

  // Después de escribir se relee la lista: el backend decide el principal
  // (el primero lo es siempre; borrar el principal promueve a otro).
  const saveVehicle = useCallback(
    async ({
      vehicle,
      draft,
      makePrimary,
    }: {
      vehicle: DriverVehicle | null;
      draft: VehicleDraft;
      makePrimary: boolean;
    }) => {
      if (vehicle) {
        await updateVehicleRequest(vehicle, draft, makePrimary, accessToken);
      } else {
        await createVehicle(draft, makePrimary, accessToken);
      }
      setVehicles(await listVehicles(accessToken));
      setVehiclesStatus('success');
    },
    [accessToken],
  );

  const removeVehicle = useCallback(
    async (vehicleId: string) => {
      await deleteVehicle(vehicleId, accessToken);
      setVehicles(await listVehicles(accessToken));
      setVehiclesStatus('success');
    },
    [accessToken],
  );

  const value = useMemo(
    () => ({
      accessToken,
      bookings,
      bookingsStatus,
      refreshBookings,
      vehicles,
      vehiclesStatus,
      refreshVehicles,
      createReservation,
      saveVehicle,
      removeVehicle,
    }),
    [
      accessToken,
      bookings,
      bookingsStatus,
      refreshBookings,
      vehicles,
      vehiclesStatus,
      refreshVehicles,
      createReservation,
      saveVehicle,
      removeVehicle,
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
