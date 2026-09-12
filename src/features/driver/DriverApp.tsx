import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useToast } from '../../lib/notifications/ToastProvider';
import { signOut } from '../../lib/supabase/session';
import { getErrorMessage } from '../auth/errors';
import { DriverIcon } from './icons';
import {
  BOOKINGS,
  PARKING_LOTS,
  VEHICLE_KINDS,
  type Booking,
  type BookingStatus,
  type ParkingLot,
  type VehicleKind,
} from './mock';
import { driverStyles } from './styles';

type DriverTab = 'explore' | 'reservations' | 'profile';

type Props = {
  session: Session;
};

const TABS: Array<{
  id: DriverTab;
  label: string;
  icon: 'search' | 'calendar' | 'user';
}> = [
  { id: 'explore', label: 'Buscar', icon: 'search' },
  { id: 'reservations', label: 'Reservas', icon: 'calendar' },
  { id: 'profile', label: 'Perfil', icon: 'user' },
];

const BOOKING_FILTERS: Array<{ id: BookingStatus; label: string }> = [
  { id: 'active', label: 'Activas' },
  { id: 'completed', label: 'Completadas' },
  { id: 'cancelled', label: 'Canceladas' },
];

export function DriverApp({ session }: Props) {
  const [activeTab, setActiveTab] = useState<DriverTab>('explore');

  return (
    <View style={driverStyles.page}>
      <ScrollView
        style={driverStyles.content}
        contentContainerStyle={driverStyles.contentInner}
      >
        {activeTab === 'explore' ? <ExploreScreen /> : null}
        {activeTab === 'reservations' ? <ReservationsScreen /> : null}
        {activeTab === 'profile' ? <ProfileScreen session={session} /> : null}
      </ScrollView>

      <View style={driverStyles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[
                driverStyles.tabItem,
                isActive && driverStyles.tabItemActive,
              ]}
              onPress={() => {
                setActiveTab(tab.id);
              }}
            >
              <DriverIcon
                name={tab.icon}
                size={22}
                color={isActive ? '#ffffff' : '#475467'}
              />
              <Text
                style={[
                  driverStyles.tabText,
                  isActive && driverStyles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ExploreScreen() {
  const [vehicleKind, setVehicleKind] = useState<VehicleKind>('Auto');
  const [selectedParkingId, setSelectedParkingId] = useState(
    PARKING_LOTS[0].id,
  );
  const selectedParking =
    PARKING_LOTS.find((parking) => parking.id === selectedParkingId) ??
    PARKING_LOTS[0];

  return (
    <View style={driverStyles.sectionStack}>
      <View style={driverStyles.topBar}>
        <View style={driverStyles.avatar}>
          <Text style={driverStyles.avatarText}>P</Text>
        </View>
        <View style={driverStyles.locationPill}>
          <DriverIcon name="pin" size={18} color="#0e5fd8" />
          <Text style={driverStyles.locationText}>Buenos Aires</Text>
        </View>
        <Pressable style={driverStyles.roundAction}>
          <DriverIcon name="bell" size={20} color="#475467" />
        </Pressable>
      </View>

      <View>
        <Text style={driverStyles.kicker}>Reserva rápida</Text>
        <Text style={driverStyles.heroTitle}>¿Dónde estacionás hoy?</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={driverStyles.vehicleList}
      >
        {VEHICLE_KINDS.map((kind) => {
          const selected = kind === vehicleKind;
          return (
            <Pressable
              key={kind}
              style={[
                driverStyles.vehicleChip,
                selected && driverStyles.vehicleChipActive,
              ]}
              onPress={() => {
                setVehicleKind(kind);
              }}
            >
              <DriverIcon
                name="car"
                size={22}
                color={selected ? '#ffffff' : '#475467'}
              />
              <Text
                style={[
                  driverStyles.vehicleChipText,
                  selected && driverStyles.vehicleChipTextActive,
                ]}
              >
                {kind}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={driverStyles.timeFilterRow}>
        <View style={driverStyles.timeFilterBox}>
          <Text style={driverStyles.filterLabel}>Entrada</Text>
          <Text style={driverStyles.filterValue}>Hoy 18:30</Text>
        </View>
        <View style={driverStyles.timeFilterBox}>
          <Text style={driverStyles.filterLabel}>Estadía</Text>
          <Text style={driverStyles.filterValue}>2 horas</Text>
        </View>
      </View>

      <View style={driverStyles.mapStage}>
        <MapSurface />

        <View style={driverStyles.mapSearchBar}>
          <View style={driverStyles.searchInputWrap}>
            <DriverIcon name="search" size={20} color="#98a2b3" />
            <TextInput
              style={driverStyles.searchInput}
              placeholder="Destino, calle o barrio"
              placeholderTextColor="#98a2b3"
              autoCapitalize="words"
            />
          </View>
          <Pressable style={driverStyles.mapFilterButton}>
            <DriverIcon name="filter" size={21} color="#0e5fd8" />
          </Pressable>
        </View>

        <View style={driverStyles.mapControls}>
          <Pressable style={driverStyles.mapControlButton}>
            <DriverIcon name="plus" size={18} color="#101828" />
          </Pressable>
          <Pressable style={driverStyles.mapControlButton}>
            <DriverIcon name="minus" size={18} color="#101828" />
          </Pressable>
        </View>

        {PARKING_LOTS.map((parking) => {
          const selected = parking.id === selectedParking.id;
          return (
            <MapPin
              key={parking.id}
              left={parking.mapPosition.left}
              top={parking.mapPosition.top}
              selected={selected}
              onPress={() => {
                setSelectedParkingId(parking.id);
              }}
            />
          );
        })}

        <View style={driverStyles.selectedParkingCard}>
          <View style={driverStyles.selectedParkingHeader}>
            <View style={driverStyles.selectedParkingIcon}>
              <DriverIcon name="car" size={24} color="#0e5fd8" />
            </View>
            <View style={driverStyles.selectedParkingCopy}>
              <Text style={driverStyles.selectedParkingName}>
                {selectedParking.name}
              </Text>
              <Text style={driverStyles.selectedParkingAddress}>
                {selectedParking.address}
              </Text>
            </View>
            <Text style={driverStyles.rating}>★ {selectedParking.rating}</Text>
          </View>

          <View style={driverStyles.selectedParkingMeta}>
            <Text style={driverStyles.priceText}>
              {selectedParking.priceLabel}
            </Text>
            <Text style={driverStyles.metaText}>{selectedParking.eta}</Text>
            <Text style={driverStyles.metaText}>
              {selectedParking.availableSpots} lugares
            </Text>
          </View>

          <Pressable style={driverStyles.reserveButton}>
            <Text style={driverStyles.reserveButtonText}>Reservar ahora</Text>
            <DriverIcon name="arrow" size={18} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <View style={driverStyles.nearbySection}>
        <View style={driverStyles.sectionHeader}>
          <Text style={driverStyles.sectionTitle}>Cerca tuyo</Text>
          <Text style={driverStyles.sectionAction}>Ver todos</Text>
        </View>

        {PARKING_LOTS.map((parking) => (
          <ParkingCard
            key={parking.id}
            parking={parking}
            selected={parking.id === selectedParking.id}
            onPress={() => {
              setSelectedParkingId(parking.id);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function MapSurface() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 360 500">
      <Rect width="360" height="500" fill="#e5edf7" />
      <Path
        d="M-30 88 C82 54 156 68 390 10"
        stroke="#ffffff"
        strokeWidth="28"
      />
      <Path
        d="M-20 236 C90 205 171 217 388 148"
        stroke="#ffffff"
        strokeWidth="24"
      />
      <Path
        d="M16 425 C116 346 213 355 382 300"
        stroke="#ffffff"
        strokeWidth="24"
      />
      <Path
        d="M214 -30 C188 92 159 206 113 530"
        stroke="#ffffff"
        strokeWidth="27"
      />
      <Path
        d="M310 -12 C252 76 246 190 248 534"
        stroke="#f7faff"
        strokeWidth="15"
      />
      <Rect
        x="28"
        y="120"
        width="82"
        height="58"
        rx="14"
        fill="#f7faff"
        stroke="#d0d9e6"
      />
      <Rect x="206" y="83" width="92" height="70" rx="16" fill="#fff7df" />
      <Rect x="188" y="332" width="78" height="68" rx="16" fill="#d9f4e7" />
      <Rect
        x="54"
        y="303"
        width="96"
        height="68"
        rx="16"
        fill="#f7faff"
        stroke="#d0d9e6"
      />
      <Circle cx="80" cy="220" r="34" fill="#bfe7ff" opacity="0.7" />
      <Path
        d="M-20 363 C42 390 91 394 157 369"
        stroke="#94d3f7"
        strokeWidth="18"
        opacity="0.7"
      />
    </Svg>
  );
}

function MapPin({
  left,
  top,
  selected,
  onPress,
}: {
  left: `${number}%`;
  top: `${number}%`;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        driverStyles.mapPin,
        selected && driverStyles.mapPinSelected,
        { left, top },
      ]}
      onPress={onPress}
    >
      <View style={driverStyles.mapPinDot} />
    </Pressable>
  );
}

function ParkingCard({
  parking,
  selected,
  onPress,
}: {
  parking: ParkingLot;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        driverStyles.parkingCard,
        selected && driverStyles.parkingCardSelected,
      ]}
      onPress={onPress}
    >
      <View style={driverStyles.parkingThumb}>
        <DriverIcon name="car" size={32} color="#0e5fd8" />
      </View>

      <View style={driverStyles.parkingBody}>
        <View style={driverStyles.parkingTitleRow}>
          <Text style={driverStyles.parkingName}>{parking.name}</Text>
          <Text style={driverStyles.rating}>★ {parking.rating}</Text>
        </View>
        <Text style={driverStyles.parkingAddress}>{parking.address}</Text>
        <View style={driverStyles.parkingMetaRow}>
          <Text style={driverStyles.priceText}>{parking.priceLabel}</Text>
          <Text style={driverStyles.dotText}>•</Text>
          <Text style={driverStyles.metaText}>{parking.eta}</Text>
          <Text style={driverStyles.dotText}>•</Text>
          <Text style={driverStyles.metaText}>{parking.distance}</Text>
          <Text style={driverStyles.dotText}>•</Text>
          <Text style={driverStyles.metaText}>
            {parking.availableSpots} lugares
          </Text>
        </View>
        <Text style={driverStyles.openText}>{parking.openUntil}</Text>
        <View style={driverStyles.serviceRow}>
          {parking.services.slice(0, 2).map((service) => (
            <Text key={service} style={driverStyles.serviceChip}>
              {service}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function ReservationsScreen() {
  const [status, setStatus] = useState<BookingStatus>('active');
  const bookings = BOOKINGS.filter((booking) => booking.status === status);

  return (
    <View style={driverStyles.sectionStack}>
      <View>
        <Text style={driverStyles.screenTitle}>Mis reservas</Text>
        <Text style={driverStyles.screenCopy}>
          Consultá tus tickets, estados y reservas anteriores.
        </Text>
      </View>

      <View style={driverStyles.segmented}>
        {BOOKING_FILTERS.map((filter) => {
          const selected = filter.id === status;
          return (
            <Pressable
              key={filter.id}
              style={[
                driverStyles.segmentedItem,
                selected && driverStyles.segmentedItemActive,
              ]}
              onPress={() => {
                setStatus(filter.id);
              }}
            >
              <Text
                style={[
                  driverStyles.segmentedText,
                  selected && driverStyles.segmentedTextActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={driverStyles.cardList}>
        {bookings.map((booking) => (
          <BookingCard key={booking.id} booking={booking} />
        ))}
      </View>
    </View>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const statusLabel =
    booking.status === 'active'
      ? 'Activa'
      : booking.status === 'completed'
        ? 'Completada'
        : 'Cancelada';

  return (
    <View style={driverStyles.bookingCard}>
      <View style={driverStyles.bookingHeader}>
        <View style={driverStyles.ticketIcon}>
          <DriverIcon name="ticket" size={22} color="#0e5fd8" />
        </View>
        <View style={driverStyles.bookingHeading}>
          <Text style={driverStyles.bookingName}>{booking.parkingName}</Text>
          <Text style={driverStyles.parkingAddress}>{booking.address}</Text>
        </View>
        <Text
          style={[
            driverStyles.statusPill,
            booking.status === 'cancelled' && driverStyles.statusPillMuted,
          ]}
        >
          {statusLabel}
        </Text>
      </View>

      <View style={driverStyles.bookingDetails}>
        <View>
          <Text style={driverStyles.detailLabel}>Fecha</Text>
          <Text style={driverStyles.detailValue}>{booking.dateLabel}</Text>
        </View>
        <View>
          <Text style={driverStyles.detailLabel}>Horario</Text>
          <Text style={driverStyles.detailValue}>{booking.timeLabel}</Text>
        </View>
        <View>
          <Text style={driverStyles.detailLabel}>Total</Text>
          <Text style={driverStyles.detailValue}>{booking.priceLabel}</Text>
        </View>
      </View>

      <View style={driverStyles.bookingActions}>
        <Text style={driverStyles.ticketCode}>{booking.ticketCode}</Text>
        <Pressable style={driverStyles.smallPrimaryButton}>
          <Text style={driverStyles.smallPrimaryButtonText}>Ver ticket</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProfileScreen({ session }: Props) {
  const { showToast } = useToast();
  const [pendingSignOut, setPendingSignOut] = useState(false);

  async function handleSignOut() {
    setPendingSignOut(true);
    try {
      await signOut();
    } catch (error) {
      showToast({ message: getErrorMessage(error), kind: 'error' });
    } finally {
      setPendingSignOut(false);
    }
  }

  return (
    <View style={driverStyles.sectionStack}>
      <View>
        <Text style={driverStyles.screenTitle}>Perfil</Text>
        <Text style={driverStyles.screenCopy}>
          Configuración básica para probar el flujo de conductor.
        </Text>
      </View>

      <View style={driverStyles.profileCard}>
        <Text style={driverStyles.profileLabel}>Cuenta</Text>
        <Text style={driverStyles.profileValue}>
          {session.user.email ?? session.user.id}
        </Text>
      </View>

      <View style={driverStyles.profileCard}>
        <Text style={driverStyles.profileLabel}>Vehículo principal</Text>
        <View style={driverStyles.vehicleProfileRow}>
          <DriverIcon name="car" size={26} color="#0e5fd8" />
          <View>
            <Text style={driverStyles.profileValue}>Auto</Text>
            <Text style={driverStyles.profileHint}>Patente ABC 123</Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[
          driverStyles.secondaryButton,
          pendingSignOut && driverStyles.buttonDisabled,
        ]}
        onPress={() => {
          void handleSignOut();
        }}
        disabled={pendingSignOut}
      >
        <Text style={driverStyles.secondaryButtonText}>
          {pendingSignOut ? 'Cerrando...' : 'Cerrar sesión'}
        </Text>
      </Pressable>
    </View>
  );
}
