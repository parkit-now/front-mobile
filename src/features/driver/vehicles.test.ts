import { describe, expect, it } from 'vitest';
import type { Booking } from './mock';
import { makeBooking } from './testFixtures';
import {
  acceptedCategoriesLabel,
  acceptedVehicles,
  categoryLabel,
  describeVehicle,
  formatPlate,
  hasActiveReservation,
  isReservableCategory,
  isValidPlate,
  normalizePlate,
  pickReservationVehicle,
  unacceptedVehicleNotice,
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
  const booking = (vehiclePlate: string, status: Booking['status']): Booking =>
    makeBooking({
      id: `b-${vehiclePlate}-${status}`,
      vehiclePlate,
      status,
      cancellable: status === 'active',
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

describe('vehículos aceptados por el estacionamiento', () => {
  const SUV: DriverVehicle = {
    ...AUTO,
    id: 'suv',
    plate: 'ZZ999ZZ',
    category: 'suv',
  };

  it('filtra por las categorías que toma el estacionamiento', () => {
    expect(acceptedVehicles([AUTO, MOTO, SUV], ['car', 'suv'])).toEqual([
      AUTO,
      SUV,
    ]);
    expect(acceptedVehicles([AUTO, MOTO], ['motorcycle'])).toEqual([MOTO]);
    expect(acceptedVehicles([AUTO], [])).toEqual([]);
  });

  it('avisa cuando ningún vehículo del conductor sirve', () => {
    expect(unacceptedVehicleNotice([MOTO], ['car', 'suv'])).toBe(
      'Este estacionamiento no toma reservas para motos.',
    );
    expect(unacceptedVehicleNotice([MOTO, SUV], ['car'])).toBe(
      'Este estacionamiento no toma reservas para motos ni SUV.',
    );
  });

  it('no avisa si alguno sirve o si no cargó vehículos', () => {
    expect(unacceptedVehicleNotice([AUTO, MOTO], ['car'])).toBeNull();
    expect(unacceptedVehicleNotice([], ['car'])).toBeNull();
  });

  it('lista lo que acepta con las etiquetas de la plataforma', () => {
    expect(acceptedCategoriesLabel(['car', 'suv'])).toBe('Auto · SUV');
    expect(
      acceptedCategoriesLabel(['van'], [{ code: 'van', label: 'Utilitario' }]),
    ).toBe('Utilitario');
  });
});
