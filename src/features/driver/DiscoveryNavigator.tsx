import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { DiscoveryStackParamList } from './navigation';
import { DestinationSearchScreen } from './screens/DestinationSearchScreen';
import { DiscoveryHomeScreen } from './screens/DiscoveryHomeScreen';
import { MapResultsScreen } from './screens/MapResultsScreen';

const Stack = createNativeStackNavigator<DiscoveryStackParamList>();

export function DiscoveryNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="DiscoveryHome" component={DiscoveryHomeScreen} />
      <Stack.Screen
        name="DestinationSearch"
        component={DestinationSearchScreen}
      />
      <Stack.Screen name="MapResults" component={MapResultsScreen} />
    </Stack.Navigator>
  );
}
