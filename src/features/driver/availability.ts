// Escala de disponibilidad por porcentaje de lugares libres sobre la
// capacidad total (tenant.settings.capacity.total en el backend).
//
//   > 50 %   high      verde
//   25–50 %  medium    amarillo
//   10–25 %  low       naranja
//   < 10 %   critical  rojo (incluye sin lugares)
//
// Sin dato confiable es `unknown`: nunca se muestra como cero ni como lleno.
export type AvailabilityLevel =
  | 'high'
  | 'medium'
  | 'low'
  | 'critical'
  | 'unknown';

export function availabilityLevel(
  availableSpots: number | null,
  totalSpots: number | null,
): AvailabilityLevel {
  if (
    availableSpots === null ||
    totalSpots === null ||
    !Number.isFinite(availableSpots) ||
    !Number.isFinite(totalSpots) ||
    totalSpots <= 0 ||
    availableSpots < 0
  ) {
    return 'unknown';
  }

  const ratio = Math.min(availableSpots, totalSpots) / totalSpots;
  if (ratio > 0.5) return 'high';
  if (ratio >= 0.25) return 'medium';
  if (ratio >= 0.1) return 'low';
  return 'critical';
}

export function availabilityLabel(availableSpots: number | null): string {
  if (availableSpots === null) return 'Disponibilidad sin datos';
  if (availableSpots === 0) return 'Sin lugares ahora';
  return availableSpots === 1
    ? '1 lugar libre ahora'
    : `${availableSpots} lugares libres ahora`;
}
