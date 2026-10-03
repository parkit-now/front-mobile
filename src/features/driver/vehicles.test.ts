import { describe, expect, it } from 'vitest';
import type { Booking } from './mock';
import {
  addVehicle,
  describeVehicle,
  formatPlate,
  getPrimaryVehicle,
  hasActiveReservation,
  isValidPlate,
  normalizePlate,
  pickReservationVehicle,
  removeVehicle,
  setPrimaryVehicle,
  updateVehicle,
  validateVehicle,
  type DriverVehicle,
  type VehicleDraft,
} from './vehicles';

const AUTO: DriverVehicle = {
  id: 'auto',
  plate: 'AB123CD',
  kind: 'Auto',
  brand: 'Toyota',
  model: 'Etios',
  isPrimary: true,
};
const MOTO: DriverVehicle = {
  id: 'moto',
  plate: 'A123BCD',
  kind: 'Moto',
  brand: 'Honda',
  model: 'Wave',
  isPrimary: false,
};

function draft(overrides: Partial<VehicleDraft> = {}): VehicleDraft {
  return {
    plate: 'ac 456 fg',
    kind: 'Auto',
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

describe('vehículo principal', () => {
  it('el primer vehículo agregado queda como principal', () => {
    const vehicles = addVehicle([], draft(), { id: 'n', makePrimary: false });
    expect(getPrimaryVehicle(vehicles)?.plate).toBe('AC456FG');
  });

  it('agregar como principal desmarca al anterior', () => {
    const vehicles = addVehicle([AUTO], draft(), {
      id: 'n',
      makePrimary: true,
    });
    expect(vehicles.filter((vehicle) => vehicle.isPrimary)).toHaveLength(1);
    expect(getPrimaryVehicle(vehicles)?.id).toBe('n');
  });

  it('cambiar el principal deja uno solo marcado', () => {
    const vehicles = setPrimaryVehicle([AUTO, MOTO], MOTO.id);
    expect(vehicles.map((vehicle) => vehicle.isPrimary)).toEqual([false, true]);
  });

  it('al borrar el principal pasa a serlo el siguiente', () => {
    expect(getPrimaryVehicle(removeVehicle([AUTO, MOTO], AUTO.id))?.id).toBe(
      MOTO.id,
    );
    expect(removeVehicle([AUTO], AUTO.id)).toEqual([]);
  });

  it('editar conserva el principal y normaliza la patente', () => {
    const [edited] = updateVehicle(
      [AUTO],
      AUTO.id,
      draft({ plate: 'zz 999 yy' }),
    );
    expect(edited).toMatchObject({ plate: 'ZZ999YY', isPrimary: true });
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
