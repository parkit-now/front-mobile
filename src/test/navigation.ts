import { vi } from 'vitest';

/**
 * Navegación falsa que devuelve `useNavigation()` en los tests (ver
 * `setup-ui.ts`). Se resetea entre tests con `resetNavigation()`.
 */
export const navigation = {
  navigate: vi.fn(),
  goBack: vi.fn(),
  replace: vi.fn(),
  popTo: vi.fn(),
  setParams: vi.fn(),
  getParent: vi.fn(() => navigation),
  addListener: vi.fn(() => vi.fn()),
  canGoBack: vi.fn(() => true),
  dispatch: vi.fn(),
};

export const route: { key: string; name: string; params: unknown } = {
  key: 'test-route',
  name: 'Test',
  params: undefined,
};

export function resetNavigation() {
  for (const fn of Object.values(navigation)) fn.mockClear();
  route.params = undefined;
}
