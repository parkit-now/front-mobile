import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
} from 'react-native';

export type ToastKind = 'error' | 'success' | 'info';

type ToastState = {
  id: number;
  message: string;
  kind: ToastKind;
} | null;

type ToastContextValue = {
  showToast: (input: { message: string; kind?: ToastKind }) => void;
  dismissToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;
const TOP_INSET =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const dismissToast = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 160,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [opacity, translateY]);

  const showToast = useCallback<ToastContextValue['showToast']>(
    ({ message, kind = 'error' }) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      setToast({ id: Date.now(), message, kind });
      translateY.setValue(-120);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      timerRef.current = setTimeout(() => {
        dismissToast();
      }, AUTO_DISMISS_MS);
    },
    [dismissToast, opacity, translateY],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.wrapper,
            { top: TOP_INSET + 8, opacity, transform: [{ translateY }] },
          ]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <Pressable
            style={[styles.toast, kindStyle(toast.kind)]}
            onPress={dismissToast}
            accessibilityLabel={`Cerrar ${toast.kind === 'error' ? 'error' : 'aviso'}: ${toast.message}`}
          >
            <Text style={[styles.message, kindTextStyle(toast.kind)]}>
              {toast.message}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}

function kindStyle(kind: ToastKind) {
  if (kind === 'error') return styles.toastError;
  if (kind === 'success') return styles.toastSuccess;
  return styles.toastInfo;
}

function kindTextStyle(kind: ToastKind) {
  if (kind === 'error') return styles.messageError;
  if (kind === 'success') return styles.messageSuccess;
  return styles.messageInfo;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#101828',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  toastError: {
    backgroundColor: '#fff1ef',
    borderColor: '#f6c7bf',
  },
  toastSuccess: {
    backgroundColor: '#ecfdf3',
    borderColor: '#abefc6',
  },
  toastInfo: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d9e6',
  },
  message: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  messageError: {
    color: '#b42318',
  },
  messageSuccess: {
    color: '#027a48',
  },
  messageInfo: {
    color: '#101828',
  },
});
