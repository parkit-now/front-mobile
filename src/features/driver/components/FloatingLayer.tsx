import {
  createContext,
  forwardRef,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  floatingBounds,
  placeFloating,
  relativeTo,
  type Align,
  type Bounds,
  type Rect,
  type Side,
} from '../floatingPlacement';
import { driverColors, driverRadius } from '../theme';

// Capa flotante para desplegables: los paneles (opciones, calendario, rueda de
// horas) se dibujan ARRIBA del contenido, anclados al campo que los abre, sin
// empujar ni agrandar el modal que tienen detrás.
//
// - `FloatingLayerHost` envuelve la raíz de la pantalla o del modal. Un
//   <Modal> nativo es otra ventana: necesita su propio host adentro (la capa
//   de la app quedaría debajo). No se anidan Modals nativos: en Android con
//   Fabric se abren sin tamaño (ver OverlaySheet).
// - `Popover` se declara al lado del campo y se dibuja en el host más cercano.
//   Sólo hay uno abierto por host: abrir otro cierra el anterior.
//
// El contenido del panel se renderiza dentro del host: los contextos que lea
// son los del host, no los del campo (hoy sólo reciben props).

type HostApi = {
  hostRef: RefObject<View>;
  render: (id: string, node: ReactNode) => void;
  remove: (id: string) => void;
  activate: (id: string, close: () => void) => void;
  deactivate: (id: string) => void;
};

/** Para cerrar el panel abierto desde afuera (p. ej. el atrás de un Modal). */
export type FloatingLayerHandle = {
  /** Cierra el panel abierto. `false` si no había ninguno. */
  dismiss: () => boolean;
};

const FloatingContext = createContext<HostApi | null>(null);

type Layer = { id: string; node: ReactNode };

export const FloatingLayerHost = forwardRef<
  FloatingLayerHandle,
  { children: ReactNode; style?: StyleProp<ViewStyle> }
>(function FloatingLayerHost({ children, style }, ref) {
  const hostRef = useRef<View>(null);
  const [layers, setLayers] = useState<readonly Layer[]>([]);
  const active = useRef<{ id: string; close: () => void } | null>(null);

  const api = useMemo<HostApi>(
    () => ({
      hostRef,
      render(id, node) {
        setLayers((current) => {
          const index = current.findIndex((layer) => layer.id === id);
          if (index === -1) return [...current, { id, node }];
          const next = current.slice();
          next[index] = { id, node };
          return next;
        });
      },
      remove(id) {
        setLayers((current) => current.filter((layer) => layer.id !== id));
      },
      activate(id, close) {
        const previous = active.current;
        active.current = { id, close };
        if (previous && previous.id !== id) previous.close();
      },
      deactivate(id) {
        if (active.current?.id === id) active.current = null;
      },
    }),
    [],
  );

  useImperativeHandle(
    ref,
    () => ({
      dismiss() {
        const current = active.current;
        if (!current) return false;
        current.close();
        return true;
      },
    }),
    [],
  );

  return (
    <FloatingContext.Provider value={api}>
      <View ref={hostRef} collapsable={false} style={[styles.host, style]}>
        {children}
        <View style={styles.layer}>
          {layers.map((layer) => (
            <Fragment key={layer.id}>{layer.node}</Fragment>
          ))}
        </View>
      </View>
    </FloatingContext.Provider>
  );
});

export type PopoverProps = {
  open: boolean;
  onClose: () => void;
  /** El campo al que se ancla el panel (mismo ancho por defecto). */
  anchorRef: RefObject<View>;
  /** `anchor`: el ancho del campo. Un número: ancho fijo. */
  width?: 'anchor' | number;
  minWidth?: number;
  /** Alto máximo: lo que no entra se scrollea dentro del panel. */
  maxHeight?: number;
  /** Borde del campo con el que se alinea el panel. */
  align?: Align;
  /**
   * No baja el teclado al abrir: para paneles que acompañan a un campo de
   * texto mientras se escribe (sugerencias). El panel se ubica en el espacio
   * que deja el teclado.
   */
  keepKeyboard?: boolean;
  accessibilityLabel: string;
  testID?: string;
  children: ReactNode;
};

/**
 * Panel flotante anclado a un campo: abre abajo, o arriba si no entra; tocar
 * afuera o el atrás de Android lo cierra. No cambia el layout de lo de atrás.
 */
export function Popover({ open, onClose, ...panel }: PopoverProps) {
  const host = useContext(FloatingContext);
  const id = useId();
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const close = useCallback(() => {
    onCloseRef.current();
  }, []);
  const exited = useCallback(() => {
    setPresent(false);
  }, []);

  useEffect(() => {
    if (!host || !open) return;
    host.activate(id, close);
    return () => {
      host.deactivate(id);
    };
  }, [host, id, open, close]);

  // Se re-dibuja en el host en cada render: el panel ve siempre los props
  // vigentes (valor elegido, opciones, mes del calendario).
  useEffect(() => {
    if (!host) return;
    if (!present) {
      host.remove(id);
      return;
    }
    host.render(
      id,
      <FloatingPanel
        {...panel}
        open={open}
        onClose={close}
        onExited={exited}
        hostRef={host.hostRef}
      />,
    );
  });

  useEffect(
    () => () => {
      host?.remove(id);
    },
    [host, id],
  );

  if (!host && __DEV__) {
    console.warn('Popover sin FloatingLayerHost: el panel no se va a ver.');
  }
  return null;
}

const ENTER_MS = 180;
const EXIT_MS = 130;
const PANEL_BORDER = 1;
const ENTER_EASING = Easing.bezier(0.16, 1, 0.3, 1);
const EXIT_EASING = Easing.in(Easing.quad);

type Frame = { anchor: Rect; bounds: Bounds };

function measureInWindow(view: View | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) {
      resolve(null);
      return;
    }
    view.measureInWindow((x, y, width, height) => {
      resolve({ x, y, width, height });
    });
  });
}

function keyboardHeight(): number {
  return Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0;
}

function FloatingPanel({
  open,
  onClose,
  onExited,
  anchorRef,
  hostRef,
  width = 'anchor',
  minWidth = 0,
  maxHeight = 360,
  align = 'start',
  keepKeyboard = false,
  accessibilityLabel,
  testID,
  children,
}: Omit<PopoverProps, 'onClose'> & {
  onClose: () => void;
  onExited: () => void;
  hostRef: RefObject<View>;
}) {
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const [frame, setFrame] = useState<Frame | null>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const lockedSide = useRef<Side | undefined>(undefined);
  const progress = useSharedValue(0);
  const direction = useSharedValue(-1);

  const env = useRef({ insets, window });
  env.current = { insets, window };

  // Mide campo y capa en la misma ventana y pasa a coordenadas de la capa:
  // así no importa si el Modal arranca debajo de la barra de estado.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let subscription: { remove: () => void } | undefined;

    function measure() {
      subscription?.remove();
      if (timer) clearTimeout(timer);
      void Promise.all([
        measureInWindow(anchorRef.current),
        measureInWindow(hostRef.current),
      ]).then(([anchor, host]) => {
        if (cancelled) return;
        if (!anchor || !host || anchor.width === 0) {
          onClose();
          return;
        }
        const { insets: safe, window: win } = env.current;
        lockedSide.current = undefined;
        setFrame({
          anchor: relativeTo(anchor, host),
          bounds: floatingBounds({
            host,
            windowWidth: win.width,
            windowHeight: win.height,
            insets: safe,
            keyboardHeight: keyboardHeight(),
          }),
        });
      });
    }

    // Con el teclado abierto, primero se baja: el modal se reacomoda y recién
    // ahí se mide el campo. Salvo que el panel acompañe a lo que se escribe.
    if (Keyboard.isVisible() && !keepKeyboard) {
      subscription = Keyboard.addListener('keyboardDidHide', measure);
      timer = setTimeout(measure, 400);
      Keyboard.dismiss();
    } else {
      measure();
    }
    return () => {
      cancelled = true;
      subscription?.remove();
      if (timer) clearTimeout(timer);
    };
  }, [open, anchorRef, hostRef, onClose, keepKeyboard]);

  // Rotar o cambiar el tamaño de la ventana invalida la posición: se cierra.
  const lastWindow = useRef(window);
  useEffect(() => {
    const previous = lastWindow.current;
    lastWindow.current = window;
    if (
      open &&
      (previous.width !== window.width || previous.height !== window.height)
    ) {
      onClose();
    }
  }, [open, onClose, window]);

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        onClose();
        return true;
      },
    );
    return () => {
      subscription.remove();
    };
  }, [open, onClose]);

  const panelWidth = frame
    ? Math.max(width === 'anchor' ? frame.anchor.width : width, minWidth)
    : 0;
  const naturalHeight =
    contentHeight === null
      ? null
      : Math.min(contentHeight + PANEL_BORDER * 2, maxHeight);
  const placement =
    frame && naturalHeight !== null
      ? placeFloating({
          anchor: frame.anchor,
          bounds: frame.bounds,
          contentHeight: naturalHeight,
          width: panelWidth,
          align,
          side: lockedSide.current,
        })
      : null;
  const placedSide = placement?.side;

  useEffect(() => {
    if (!placedSide) return;
    // Si el contenido crece (otro mes, otras horas) el panel no salta de lado.
    lockedSide.current = placedSide;
  }, [placedSide]);

  useEffect(() => {
    if (!open || !placedSide) return;
    direction.value = placedSide === 'below' ? -1 : 1;
    progress.value = withTiming(1, {
      duration: reduceMotion ? 0 : ENTER_MS,
      easing: ENTER_EASING,
    });
  }, [open, placedSide, reduceMotion, progress, direction]);

  useEffect(() => {
    if (open) return;
    progress.value = withTiming(
      0,
      { duration: reduceMotion ? 0 : EXIT_MS, easing: EXIT_EASING },
      (finished) => {
        if (finished) runOnJS(onExited)();
      },
    );
  }, [open, reduceMotion, progress, onExited]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: direction.value * 8 * (1 - progress.value) },
      { scale: 0.97 + 0.03 * progress.value },
    ],
  }));

  const overflow =
    placement !== null &&
    contentHeight !== null &&
    contentHeight + PANEL_BORDER * 2 > placement.height + 0.5;

  return (
    <View
      style={[styles.fill, { pointerEvents: open ? 'auto' : 'none' }]}
      testID={testID ? `${testID}-layer` : undefined}
    >
      <Pressable
        style={styles.fill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        testID={testID ? `${testID}-backdrop` : undefined}
      />
      {frame ? (
        <Animated.View
          testID={testID}
          accessibilityViewIsModal
          accessibilityLabel={accessibilityLabel}
          style={[
            styles.panel,
            placement
              ? {
                  top: placement.top,
                  left: placement.left,
                  width: placement.width,
                  height: placement.height,
                }
              : {
                  // Primera pasada, invisible: se mide el contenido.
                  top: frame.anchor.y,
                  left: frame.anchor.x,
                  width: panelWidth,
                  maxHeight,
                },
            animatedStyle,
          ]}
        >
          <View
            style={[styles.clip, placement ? styles.clipFixed : { maxHeight }]}
          >
            <ScrollView
              scrollEnabled={overflow}
              showsVerticalScrollIndicator={overflow}
              bounces={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <View
                onLayout={(event) => {
                  setContentHeight(event.nativeEvent.layout.height);
                }}
              >
                {children}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1 },
  layer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
    zIndex: 1000,
    // Android ordena por elevation entre hermanos: la capa va arriba de todo.
    elevation: 1000,
  },
  fill: { ...StyleSheet.absoluteFillObject },
  panel: {
    position: 'absolute',
    borderRadius: driverRadius.control,
    backgroundColor: driverColors.surface,
    ...Platform.select({
      web: { boxShadow: '0 12px 32px rgba(16, 24, 40, 0.18)' },
      default: {
        shadowColor: driverColors.text,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
        elevation: 16,
      },
    }),
  },
  // La sombra va en el panel y el recorte acá: con overflow hidden en el mismo
  // View, iOS no dibuja la sombra.
  clip: {
    borderRadius: driverRadius.control,
    borderWidth: PANEL_BORDER,
    borderColor: driverColors.border,
    overflow: 'hidden',
  },
  clipFixed: { flex: 1 },
});
