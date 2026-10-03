import { describe, expect, it } from 'vitest';
import type { Booking } from './mock';
import {
  categoryLabel,
  describeVehicle,
  formatPlate,
  hasActiveReservation,
  isReservableCategory,
  isValidPlate,
  normalizePlate,
  pickReservationVehicle,
  validateVehicle,
  type DriverVehicle,
  type VehicleDraft,
} from './vehicles';

const AUTO: DriverVehicle = {
  id: 'auto',
  plate: 'AB123CD',
  category: 'car',
  brand: 'Toyota',
  model: 'Etios',
  isPrimary: true,
};
const MOTO: DriverVehicle = {
  id: 'moto',
  plate: 'A123BCD',
  category: 'motorcycle',
  brand: 'Honda',
  model: 'Wave',
  isPrimary: false,
};

function draft(overrides: Partial<VehicleDraft> = {}): VehicleDraft {
  return {
    plate: 'ac 456 fg',
    category: 'car',
    brand: '',
    model: '',
    ...overrides,
  };
}

describe('patentes', () => {
  it('normaliza mayúsculas, espacios y guiones', () => {
    expect(normalizePlate(' ab-123 cd ')).toBe('AB123CD');
  });

  it('acepta los formatos argentinos de auto y moto', () => {
    expect(['AB123CD', 'ABC123', 'A123BCD', '123ABC'].every(isValidPlate)).toBe(
      true,
    );
    expect(['AB12CD', 'ABCD123', '12ABC', ''].some(isValidPlate)).toBe(false);
  });

  it('agrupa la patente según su formato', () => {
    expect(formatPlate('ab123cd')).toBe('AB 123 CD');
    expect(formatPlate('abc123')).toBe('ABC 123');
    expect(formatPlate('a123bcd')).toBe('A 123 BCD');
  });
});

describe('validateVehicle', () => {
  it('exige patente con formato válido', () => {
    expect(validateVehicle(draft({ plate: '' }), [])).toEqual({
      plate: 'Ingresá la patente',
    });
    expect(validateVehicle(draft({ plate: 'XYZ' }), []).plate).toMatch(
      /formato válido/,
    );
  });

  it('rechaza patentes repetidas salvo al editar el mismo vehículo', () => {
    expect(validateVehicle(draft({ plate: 'ab 123 cd' }), [AUTO]).plate).toBe(
      'Ya tenés un vehículo con esta patente',
    );
    expect(
      validateVehicle(draft({ plate: 'ab 123 cd' }), [AUTO], AUTO.id),
    ).toEqual({});
  });
});

describe('pickReservationVehicle', () => {
  it('sugiere el principal', () => {
    expect(pickReservationVehicle([MOTO, AUTO])?.id).toBe(AUTO.id);
  });

  it('sin principal sugiere el primero, y ninguno si no hay vehículos', () => {
    expect(
      pickReservationVehicle([MOTO, { ...AUTO, isPrimary: false }])?.id,
    ).toBe(MOTO.id);
    expect(pickReservationVehicle([])).toBeNull();
  });
});

describe('describeVehicle', () => {
  it('muestra tipo y marca/modelo cuando existen', () => {
    expect(describeVehicle(AUTO)).toBe('Auto · Toyota Etios');
    expect(describeVehicle({ ...AUTO, brand: '', model: '' })).toBe('Auto');
  });

  it('usa la etiqueta de la categoría de la plataforma', () => {
    const pickup = {
      ...AUTO,
      category: 'pickup' as const,
      brand: '',
      model: '',
    };
    expect(describeVehicle(pickup)).toBe('Pickup');
    expect(
      describeVehicle({ ...pickup, category: 'van' }, [
        { code: 'van', label: 'Utilitario' },
      ]),
    ).toBe('Utilitario');
    expect(categoryLabel('van')).toBe('Utilitario / Van');
  });
});

describe('hasActiveReservation', () => {
  const booking = (
    vehiclePlate: string,
    status: Booking['status'],
  ): Booking => ({
    id: `b-${vehiclePlate}-${status}`,
    parkingName: 'Estacionamiento Once',
    address: 'Bartolome Mitre 2500',
    entryAt: '2026-09-28T13:00:00.000Z',
    dateLabel: '28 sept',
    timeLabel: '10:00 - 12:00',
    status,
    ticketCode: 'PKT-0001',
    vehiclePlate,
    priceLabel: '$9.000',
    cancellable: status === 'active',
    coordinate: { latitude: -34.6086, longitude: -58.4019 },
  });
  const BOOKINGS = [
    booking('AB123CD', 'active'),
    booking('A123BCD', 'completed'),
  ];

  it('detecta reservas activas por patente e ignora las terminadas', () => {
    expect(hasActiveReservation(AUTO, BOOKINGS)).toBe(true);
    expect(
      hasActiveReservation(
        AUTO,
        BOOKINGS.map((booking) => ({
          ...booking,
          status: 'completed' as const,
        })),
      ),
    ).toBe(false);
    expect(hasActiveReservation(MOTO, BOOKINGS)).toBe(false);
  });
});

describe('isReservableCategory', () => {
  it('acepta sólo las categorías reservables', () => {
    expect(isReservableCategory('pickup')).toBe(true);
    expect(isReservableCategory('van')).toBe(true);
    expect(isReservableCategory('truck')).toBe(false);
    expect(isReservableCategory('suv_pickup')).toBe(false);
  });
});
