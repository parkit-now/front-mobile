import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { StyleSheet, View } from 'react-native';
import { DriverIcon, type DriverIconName } from './components/DriverIcon';
import { DriverDataProvider } from './hooks/useDriverData';
import type { DriverTabParamList } from './navigation';
import { ExploreScreen } from './screens/ExploreScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ReservationsScreen } from './screens/ReservationsScreen';
import { driverColors } from './theme';

type Props = {
  session: Session;
};

const Tab = createBottomTabNavigator<DriverTabParamList>();

const ICON_BY_ROUTE: Record<keyof DriverTabParamList, DriverIconName> = {
  Explore: 'search',
  Reservations: 'calendar',
  Profile: 'user',
};

export function DriverApp({ session }: Props) {
  return (
    <DriverDataProvider>
      <View style={styles.page}>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              sceneStyle: styles.scene,
              tabBarActiveTintColor: driverColors.brand,
              tabBarInactiveTintColor: driverColors.textSecondary,
              tabBarLabelStyle: styles.tabLabel,
              tabBarStyle: styles.tabBar,
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
              component={ExploreScreen}
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
        </NavigationContainer>
      </View>
    </DriverDataProvider>
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
});
