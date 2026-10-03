import { useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { driverColors, driverRadius, driverSpacing } from '../theme';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

// Hoja inferior dibujada como capa absoluta de la pantalla, no como <Modal>:
// en la pantalla del mapa (mapa + @gorhom/bottom-sheet, RN 0.76 con Fabric) el
// Modal nativo de Android se abre sin tamaño. Se monta solo mientras está
// abierta; el botón atrás de Android la cierra.
export function OverlaySheet({ title, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
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
  }, [onClose]);

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityLabel={`Cerrar ${title.toLocaleLowerCase('es-AR')}`}
      />
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, driverSpacing.md) },
        ]}
        accessibilityViewIsModal
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    elevation: 24,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: driverColors.overlay,
  },
  sheet: {
    width: '100%',
    paddingHorizontal: driverSpacing.lg,
    paddingTop: driverSpacing.sm,
    borderTopLeftRadius: driverRadius.card,
    borderTopRightRadius: driverRadius.card,
    backgroundColor: driverColors.surface,
    gap: driverSpacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    marginBottom: driverSpacing.xs,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: driverColors.border,
  },
  title: {
    color: driverColors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
