import type { components } from '../../../generated/api-types';
import { apiRequest } from '../../../lib/api/client';
import {
  isReservableCategory,
  type ReservableCategoryOption,
} from '../vehicles';

type CategoryDto = components['schemas']['VehicleCategoryDto'];

/** Categorías que el conductor puede elegir (las reservables), en orden. */
export function toReservableCategories(
  rows: CategoryDto[],
): ReservableCategoryOption[] {
  return rows
    .filter((row) => row.reservable)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap(({ code, label }) =>
      isReservableCategory(code) ? [{ code, label }] : [],
    );
}

export async function listReservableCategories(
  bearer: string,
): Promise<ReservableCategoryOption[]> {
  const rows = await apiRequest<CategoryDto[]>({
    method: 'GET',
    path: '/vehicle-categories',
    bearer,
  });
  return toReservableCategories(rows);
}
