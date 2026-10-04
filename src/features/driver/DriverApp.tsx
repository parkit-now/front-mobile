import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  getFocusedRouteNameFromRoute,
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Session } from '@supabase/supabase-js';
import { StyleSheet, View } from 'react-native';
import { DriverIcon, type DriverIconName } from './components/DriverIcon';
import { DiscoveryNavigator } from './DiscoveryNavigator';
import { DriverDataProvider } from './hooks/useDriverData';
import { useReservationLinks } from './hooks/useReservationLinks';
import type { DriverRootParamList, DriverTabParamList } from './navigation';
import { ReservationDetailScreen } from './screens/ReservationDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReservationsScreen } from './screens/ReservationsScreen';
import { driverColors } from './theme';

type Props = {
  session: Session;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();
const RootStack = createNativeStackNavigator<DriverRootParamList>();

const ICON_BY_ROUTE: Record<keyof DriverTabParamList, DriverIconName> = {
  Explore: 'search',
  Reservations: 'calendar',
  Profile: 'user',
};

export function DriverApp({ session }: Props) {
  return (
    <DriverDataProvider accessToken={session.access_token}>
      <DriverNavigation session={session} />
    </DriverDataProvider>
  );
}

function DriverNavigation({ session }: Props) {
  const navigationRef = useNavigationContainerRef<DriverRootParamList>();
  const onReady = useReservationLinks(navigationRef);

  return (
    <View style={styles.page}>
      <NavigationContainer ref={navigationRef} onReady={onReady}>
        <RootStack.Navigator
          screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
        >
          <RootStack.Screen name="Tabs">
            {() => <DriverTabs session={session} />}
          </RootStack.Screen>
          <RootStack.Screen
            name="ReservationDetail"
            component={ReservationDetailScreen}
            // Una sola pantalla por reserva: el deep link de vuelta del
            // checkout actualiza la que ya está abierta en vez de apilar otra.
            getId={({ params }) => params.reservationId}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}

function DriverTabs({ session }: Props) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: driverColors.brand,
        tabBarInactiveTintColor: driverColors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle:
          route.name === 'Explore' &&
          getFocusedRouteNameFromRoute(route) !== undefined &&
          getFocusedRouteNameFromRoute(route) !== 'DiscoveryHome'
            ? styles.hiddenTabBar
            : styles.tabBar,
        tabBarIcon: ({ color, size }) => (
          <DriverIcon
            name={ICON_BY_ROUTE[route.name]}
            color={color}
            size={size}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Explore"
        component={DiscoveryNavigator}
        options={{ title: 'Buscar', tabBarAccessibilityLabel: 'Buscar' }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{
          title: 'Reservas',
          tabBarAccessibilityLabel: 'Reservas',
        }}
      />
      <Tab.Screen name="Profile" options={{ title: 'Perfil' }}>
        {() => <ProfileScreen session={session} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: driverColors.background,
  },
  scene: {
    backgroundColor: driverColors.background,
  },
  tabBar: {
    backgroundColor: driverColors.surface,
    borderTopColor: driverColors.border,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  hiddenTabBar: {
    display: 'none',
  },
});
