import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  type MapMarker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { availabilityLabel, availabilityLevel } from '../availability';
import { availabilityColors, driverColors } from '../theme';
import { DriverIcon } from './DriverIcon';
import type { MapPanelProps } from './MapPanel.types';

const MAP_DELTA = 0.085;
const REDRAW_DELAYS_MS = [50, 250, 600];
const PIN_PRESS_WINDOW_MS = 1500;

// En Android `showsPointsOfInterests` no alcanza: los íconos de Google
// (hospitales, museos, comercios) compiten con los pines de Parkit. Se ocultan
// íconos y comercios; los nombres de lugares quedan porque ayudan a ubicarse.
const MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'transit',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];

export function MapPanel({
  center,
  destination,
  parkingLots,
  selectedParking,
  onSelect,
  onRegionChangeComplete,
}: MapPanelProps) {
  const [ready, setReady] = useState(false);
  const mapRef = useRef<MapView>(null);
  const markerRefs = useRef(new Map<string, MapMarker>());

  // Al tocar un pin Android centra el mapa en él. Ese movimiento se informa
  // como causado por el pin, para que la pantalla no lo tome como que el
  // conductor corrió el mapa. Si el pin ya estaba centrado no hay movimiento:
  // la marca vence sola para no tragarse el próximo gesto real.
  const pinPressed = useRef(false);
  const pinPressedTimer = useRef<ReturnType<typeof setTimeout>>();
  function markPinPressed() {
    pinPressed.current = true;
    clearTimeout(pinPressedTimer.current);
    pinPressedTimer.current = setTimeout(() => {
      pinPressed.current = false;
    }, PIN_PRESS_WINDOW_MS);
  }
  useEffect(
    () => () => {
      clearTimeout(pinPressedTimer.current);
    },
    [],
  );

  // Android convierte cada pin en una imagen y sólo la regenera cuando cambia
  // su tamaño; el marco del pin es fijo (ver `pricePin`), así que un cambio de
  // datos (precio, color de disponibilidad) hay que pedirlo con `redraw()`. Con
  // Fabric el estilo nuevo llega a la vista nativa un rato DESPUÉS del render
  // de React: una sola foto temprana captura el estado viejo. Se redibujan
  // todos varias veces; la última siempre ve el estado final.
  // Solución de transición hasta actualizar react-native-maps (SCRUM-289).
  //
  // El pin seleccionado NO cambia de aspecto por la misma razón: al elegir
  // varios seguidos el borde quedaba pegado en los anteriores. La cochera
  // elegida se ve en la hoja de resultados y su pin pasa al frente (zIndex).
  const markersSignature = parkingLots
    .map(
      (parking) =>
        `${parking.id}:${parking.availableSpots}:${parking.hourlyPriceArs}`,
    )
    .join('|');
  useEffect(() => {
    const timers = REDRAW_DELAYS_MS.map((delay) =>
      setTimeout(() => {
        markerRefs.current.forEach((marker) => {
          marker.redraw();
        });
      }, delay),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [markersSignature]);
  const initialRegion: Region = {
    ...center,
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  };

  return (
    <View style={styles.stage} accessibilityLabel="Mapa de estacionamientos">
      <MapView
        key={destination?.id ?? 'home'}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={PROVIDER_GOOGLE}
        showsCompass={false}
        showsPointsOfInterests={false}
        customMapStyle={MAP_STYLE}
        toolbarEnabled={false}
        pitchEnabled={false}
        onMapReady={() => {
          // Con la New Architecture el mapa puede aplicar `initialRegion`
          // antes de conocer su tamaño real y quedar con el zoom de toda el
          // AMBA. Ya listo, se reaplica la región con el tamaño correcto.
          mapRef.current?.animateToRegion(initialRegion, 0);
          setReady(true);
        }}
        onRegionChangeComplete={(region) => {
          const cause = pinPressed.current ? 'pin' : 'gesture';
          pinPressed.current = false;
          onRegionChangeComplete(
            { latitude: region.latitude, longitude: region.longitude },
            cause,
          );
        }}
      >
        {destination ? (
          <Marker
            coordinate={destination.coordinate}
            // Capas: pin seleccionado (3) > destino (2) > resto de pines (1).
            // Centrado sobre su punto: los pines de precio apuntan con la colita.
            zIndex={2}
            anchor={{ x: 0.5, y: 0.5 }}
            accessibilityLabel={
              destination.kind === 'current-location'
                ? 'Tu ubicación aproximada'
                : `Destino: ${destination.name}`
            }
          >
            {/* La ubicación del conductor se dibuja acá y no con
                `showsUserLocation`: en Android ese modo muestra además el botón
                nativo de "mi ubicación", que con Fabric no se puede ocultar. */}
            {destination.kind === 'current-location' ? (
              <View style={styles.userMarker} />
            ) : (
              <View style={styles.destinationMarker}>
                <DriverIcon name="pin" size={17} color={driverColors.surface} />
              </View>
            )}
          </Marker>
        ) : null}

        {parkingLots.map((parking) => {
          const selected = parking.id === selectedParking?.id;
          const level = availabilityLevel(
            parking.availableSpots,
            parking.totalSpots,
          );
          const colors = availabilityColors[level];
          return (
            <Marker
              // Key estable: cambiarla recrea el marker nativo y deja pins
              // rojos por defecto de Google huérfanos en el mapa. Los cambios
              // de datos se redibujan con `redraw()` (ver efecto arriba).
              key={parking.id}
              ref={(marker) => {
                if (marker) markerRefs.current.set(parking.id, marker);
                else markerRefs.current.delete(parking.id);
              }}
              coordinate={parking.coordinate}
              anchor={{ x: 0.5, y: 1 }}
              zIndex={selected ? 3 : 1}
              onPress={() => {
                markPinPressed();
                onSelect(parking);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${parking.name}, ${parking.priceLabel}, ${availabilityLabel(parking.availableSpots)}`}
            >
              {/* Pin de precio con el color de la disponibilidad: píldora +
                  colita que apunta a la ubicación (anchor abajo al centro). */}
              <View collapsable={false} style={styles.pricePin}>
                <View
                  style={[styles.pricePill, { backgroundColor: colors.marker }]}
                >
                  <Text
                    style={[styles.pricePinText, { color: colors.markerText }]}
                    numberOfLines={1}
                  >
                    {formatMarkerPrice(parking.hourlyPriceArs)}
                  </Text>
                </View>
                <View
                  style={[styles.priceTail, { borderTopColor: colors.marker }]}
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!ready ? (
        <View style={styles.loading}>
          <ActivityIndicator color={driverColors.brand} />
          <Text style={styles.loadingText}>Cargando mapa…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: driverColors.mapBackground,
  },
  destinationMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: driverColors.surface,
    backgroundColor: driverColors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarker: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: driverColors.surface,
    backgroundColor: driverColors.brand,
  },
  // Marco de tamaño FIJO. Android convierte el marker en una imagen; si el pin
  // cambiara de tamaño (por ejemplo, con un precio más largo), la imagen puede
  // regenerarse antes del nuevo layout y quedar mezclada. Con el marco
  // constante la imagen nunca cambia de dimensiones: sólo cambia lo de adentro.
  pricePin: {
    width: 96,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pricePill: {
    minWidth: 68,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: driverColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceTail: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  pricePinText: {
    fontSize: 14,
    fontWeight: '800',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: driverColors.mapBackground,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: driverColors.textSecondary,
    fontSize: 13,
  },
});

// "$1.800" — sin "/h" para que el pin sea compacto.
function formatMarkerPrice(hourlyPriceArs: number): string {
  return hourlyPriceArs > 0
    ? `$${hourlyPriceArs.toLocaleString('es-AR')}`
    : 'Sin tarifa';
}
