import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as Linking from 'expo-linking';
import type { Booking, ParkingLot } from '../mock';
import { buildReturnUrl } from '../reservationLinks';
import { createStaleResponseGuard } from '../staleResponseGuard';
import {
  cancelReservation as cancelReservationRequest,
  createReservation as createReservationRequest,
  getReservation,
  listReservations,
  previewCancel as previewCancelRequest,
  retryReservationPayment,
  type CancelPreview,
  type CreatedReservation,
} from '../services/reservations';
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle as updateVehicleRequest,
} from '../services/vehicles';
import { listReservableCategories } from '../services/vehicleCategories';
import {
  FALLBACK_RESERVABLE_CATEGORIES,
  type DriverVehicle,
  type ReservableCategoryOption,
  type VehicleDraft,
} from '../vehicles';

type LoadStatus = 'loading' | 'success' | 'error';

type DriverDataContextValue = {
  accessToken: string;
  bookings: Booking[];
  bookingsStatus: 'loading' | 'success' | 'error';
  refreshBookings: () => Promise<void>;
  vehicles: DriverVehicle[];
  vehiclesStatus: LoadStatus;
  refreshVehicles: () => Promise<void>;
  /** Categorías reservables; si falla la carga, quedan las de respaldo. */
  vehicleCategories: ReservableCategoryOption[];
  /**
   * Crea la reserva (`pending_payment`) en el backend y devuelve el checkout;
   * lanza ApiError si falla.
   */
  createReservation: (input: {
    id: string;
    parking: ParkingLot;
    vehicle: DriverVehicle;
    entryAt: string;
    exitAt: string;
  }) => Promise<CreatedReservation>;
  /** Relee UNA reserva del backend y la deja en la lista; lanza ApiError. */
  reloadBooking: (bookingId: string) => Promise<Booking>;
  /** Pide de nuevo el checkout de una `pending_payment`; lanza ApiError. */
  retryPayment: (bookingId: string) => Promise<CreatedReservation>;
  /** Cuánto se devolvería si se cancelara ahora; lanza ApiError. */
  previewCancel: (bookingId: string) => Promise<CancelPreview>;
  /**
   * Cancela en el backend y devuelve la reserva cancelada; lanza ApiError si
   * falla. NO toca la lista: quien llama cierra su hoja y después aplica el
   * resultado con `applyBooking`, para que las animaciones de la lista no
   * corran con la hoja todavía desmontándose.
   */
  cancelReservation: (bookingId: string) => Promise<Booking>;
  /** Deja `booking` en la lista (reemplaza o agrega). */
  applyBooking: (booking: Booking) => void;
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

  const [vehicleCategories, setVehicleCategories] = useState<
    ReservableCategoryOption[]
  >(FALLBACK_RESERVABLE_CATEGORIES);

  useEffect(() => {
    let cancelled = false;
    listReservableCategories(accessToken)
      .then((categories) => {
        if (!cancelled && categories.length > 0) {
          setVehicleCategories(categories);
        }
      })
      .catch(() => {
        // Se mantienen las de respaldo.
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // Lecturas viejas no pisan una cancelación local (ver staleResponseGuard).
  const guard = useRef(createStaleResponseGuard()).current;

  const refreshBookings = useCallback(async () => {
    setBookingsStatus((current) =>
      current === 'success' ? current : 'loading',
    );
    try {
      const rows = await listReservations(accessToken);
      if (guard.hasPendingWrites()) return;
      setBookings(rows);
      setBookingsStatus('success');
    } catch {
      setBookingsStatus('error');
    }
  }, [accessToken, guard]);

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
      const created = await createReservationRequest(
        {
          id: input.id,
          parkingId: input.parking.id,
          vehiclePlate: input.vehicle.plate,
          entryAt: input.entryAt,
          exitAt: input.exitAt,
          // Expo Go: exp://…, build: parkit://…, web: http://localhost:8081/…
          returnUrl: buildReturnUrl(input.id, Linking.createURL),
        },
        accessToken,
      );
      upsertBooking(created.booking);
      return created;
    },
    [accessToken, upsertBooking],
  );

  const reloadBooking = useCallback(
    async (bookingId: string) => {
      const ticket = guard.beginRead(bookingId);
      const booking = await getReservation(bookingId, accessToken);
      if (guard.canApply(bookingId, ticket)) upsertBooking(booking);
      return booking;
    },
    [accessToken, upsertBooking, guard],
  );

  const retryPayment = useCallback(
    async (bookingId: string) => {
      const created = await retryReservationPayment(bookingId, accessToken);
      upsertBooking(created.booking);
      return created;
    },
    [accessToken, upsertBooking],
  );

  const previewCancel = useCallback(
    (bookingId: string) => previewCancelRequest(bookingId, accessToken),
    [accessToken],
  );

  const cancelReservation = useCallback(
    async (bookingId: string) => {
      guard.beginWrite(bookingId);
      try {
        return await cancelReservationRequest(bookingId, accessToken);
      } finally {
        guard.endWrite(bookingId);
      }
    },
    [accessToken, guard],
  );

  const applyBooking = useCallback((booking: Booking) => {
    setBookings((current) =>
      current.some((item) => item.id === booking.id)
        ? current.map((item) => (item.id === booking.id ? booking : item))
        : [booking, ...current],
    );
  }, []);

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
      vehicleCategories,
      createReservation,
      reloadBooking,
      retryPayment,
      previewCancel,
      cancelReservation,
      applyBooking,
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
      vehicleCategories,
      createReservation,
      reloadBooking,
      retryPayment,
      previewCancel,
      cancelReservation,
      applyBooking,
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
