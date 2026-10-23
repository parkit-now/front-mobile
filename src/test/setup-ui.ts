/**
 * Setup compartido de los tests.
 *
 * Los mocks de acá sólo se aplican si el test (o algo que importa) carga el
 * módulo, así que no afectan a los tests de lógica pura que corren en Node.
 * Reemplazan módulos nativos que no tienen implementación en jsdom.
 *
 * `react-native` apunta a `react-native-web` (ver vitest.config.ts): los
 * componentes que se usan acá son los de la web.
 */
import { cleanup } from '@testing-library/react';
import {
  createElement,
  useEffect,
  type ComponentType,
  type ReactNode,
} from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { afterEach, vi } from 'vitest';
import { navigation, route } from './navigation';

process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
process.env.EXPO_PUBLIC_API_URL ??= 'http://localhost:3000';

// Sin `globals: true` Testing Library no desmonta solo entre tests.
afterEach(() => {
  cleanup();
});

/**
 * Módulo cuyos exports con mayúscula inicial que no estén en `known` se
 * resuelven con `fallback(nombre)`: así no hay que listar cada animación de
 * reanimated ni cada primitiva de react-native-svg.
 */
function withFallback(
  known: Record<string, unknown>,
  fallback: (name: string) => unknown,
): Record<string, unknown> {
  return new Proxy(known, {
    get: (target, key) =>
      typeof key !== 'string' || key in target || !/^[A-Z]/.test(key)
        ? target[key as string]
        : fallback(key),
    has: () => true,
  });
}

const passthrough = <T>(value: T) => value;
const Passthrough = ({ children }: { children?: ReactNode }) => children;

vi.mock('react-native-reanimated', () => {
  // Builder inerte de animaciones de entrada/salida (FadeIn.delay(...)...).
  const animation: Record<string, () => unknown> = new Proxy(
    {},
    { get: () => () => animation },
  );
  const Animated = {
    View,
    Text,
    Image,
    ScrollView,
    createAnimatedComponent: <P extends object>(Component: ComponentType<P>) =>
      Component,
  };
  return withFallback(
    {
      __esModule: true,
      default: Animated,
      ...Animated,
      LayoutAnimationConfig: Passthrough,
      useSharedValue: <T>(value: T) => ({ value }),
      useAnimatedStyle: (factory: () => object) => factory(),
      useAnimatedProps: (factory: () => object) => factory(),
      useDerivedValue: <T>(factory: () => T) => ({ value: factory() }),
      useAnimatedReaction: () => undefined,
      // Sin movimiento: las pantallas muestran directo el estado final.
      useReducedMotion: () => true,
      withTiming: passthrough,
      withSpring: passthrough,
      withDelay: (_delay: number, value: unknown) => value,
      withSequence: (...values: unknown[]) => values[values.length - 1],
      withRepeat: passthrough,
      cancelAnimation: () => undefined,
      runOnJS:
        <A extends unknown[]>(fn: (...args: A) => unknown) =>
        (...args: A) =>
          fn(...args),
      interpolate: (_value: number, _input: number[], output: number[]) =>
        output[0],
      interpolateColor: (_value: number, _input: number[], output: string[]) =>
        output[0],
      // Easing.quad, Easing.in(...), Easing.bezier(...): todas inertes.
      Easing: new Proxy({}, { get: () => () => passthrough }),
      Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
      ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    },
    () => animation,
  );
});

vi.mock('react-native-gesture-handler', () => {
  // Cualquier configuración encadenada (runOnJS, onBegin...) devuelve el
  // mismo gesto inerte.
  const gesture: Record<string, () => unknown> = new Proxy(
    {},
    { get: () => () => gesture },
  );
  return {
    GestureHandlerRootView: View,
    GestureDetector: Passthrough,
    Gesture: { Pan: () => gesture },
  };
});

vi.mock('react-native-safe-area-context', () => {
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: Passthrough,
    SafeAreaView: View,
    useSafeAreaInsets: () => insets,
    initialWindowMetrics: {
      insets,
      frame: { x: 0, y: 0, width: 390, height: 844 },
    },
  };
});

vi.mock('react-native-svg', () => {
  // Cada primitiva (Path, Ellipse, LinearGradient...) se dibuja como el
  // elemento SVG del DOM con el mismo nombre.
  const element =
    (tag: string) =>
    ({ children, ...props }: { children?: ReactNode }) =>
      createElement(tag, props, children);
  const Svg = element('svg');
  return withFallback({ __esModule: true, default: Svg, Svg }, (name) =>
    element(name[0].toLowerCase() + name.slice(1)),
  );
});

vi.mock('@react-navigation/native', () => ({
  useNavigation: () => navigation,
  useRoute: () => route,
  useIsFocused: () => true,
  useFocusEffect: (effect: () => void | (() => void)) => {
    useEffect(effect, [effect]);
  },
  NavigationContainer: Passthrough,
  useNavigationContainerRef: () => ({ current: null, isReady: () => false }),
  getFocusedRouteNameFromRoute: () => undefined,
}));

vi.mock('expo-linking', () => ({
  createURL: vi.fn((path: string) => `parkit://${path}`),
  parse: vi.fn(() => ({ path: null, queryParams: {} })),
  getInitialURL: vi.fn(() => Promise.resolve(null)),
  addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  openURL: vi.fn(() => Promise.resolve()),
  openSettings: vi.fn(() => Promise.resolve()),
}));

vi.mock('expo-web-browser', () => ({
  openAuthSessionAsync: vi.fn(() => Promise.resolve({ type: 'cancel' })),
  openBrowserAsync: vi.fn(() => Promise.resolve({ type: 'opened' })),
  dismissBrowser: vi.fn(),
  maybeCompleteAuthSession: vi.fn(),
  WebBrowserResultType: {
    CANCEL: 'cancel',
    DISMISS: 'dismiss',
    OPENED: 'opened',
    LOCKED: 'locked',
  },
}));

vi.mock('@gorhom/bottom-sheet', () => ({
  __esModule: true,
  default: View,
  BottomSheetScrollView: ScrollView,
  BottomSheetView: View,
}));

vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(() => Promise.resolve()),
  notificationAsync: vi.fn(() => Promise.resolve()),
  selectionAsync: vi.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  const storage = {
    getItem: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      store.clear();
      return Promise.resolve();
    }),
  };
  return { __esModule: true, default: storage };
});
