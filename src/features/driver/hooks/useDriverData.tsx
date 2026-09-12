import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createMockReservation } from '../createReservation';
import { BOOKINGS, type Booking, type ParkingLot } from '../mock';

type DriverDataContextValue = {
  bookings: Booking[];
  createReservation: (parking: ParkingLot) => Booking;
};

const DriverDataContext = createContext<DriverDataContextValue | null>(null);

export function DriverDataProvider({ children }: { children: ReactNode }) {
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);

  const createReservation = useCallback((parking: ParkingLot) => {
    const booking = createMockReservation(parking);

    setBookings((current) => [booking, ...current]);
    return booking;
  }, []);

  const value = useMemo(
    () => ({ bookings, createReservation }),
    [bookings, createReservation],
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
