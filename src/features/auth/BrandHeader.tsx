import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { authStyles } from './styles';

export function BrandHeader() {
  return (
    <View style={authStyles.brandLockup}>
      <View style={authStyles.brandBadge}>
        <Svg
          width={44}
          height={44}
          viewBox="0 0 44 44"
          style={{ position: 'absolute' }}
        >
          <Defs>
            <LinearGradient
              id="parkitBadgeGradient"
              x1="0"
              y1="0"
              x2="44"
              y2="44"
            >
              <Stop offset="0" stopColor="#0e5fd8" />
              <Stop offset="1" stopColor="#0b3f91" />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={0}
            width={44}
            height={44}
            rx={12}
            fill="url(#parkitBadgeGradient)"
          />
        </Svg>
        <Text style={authStyles.brandLetter}>P</Text>
      </View>
      <View style={authStyles.brandCopy}>
        <Text style={authStyles.title}>Parkit</Text>
        <Text style={authStyles.subtitle}>
          Acceso seguro para tu operacion diaria
        </Text>
      </View>
    </View>
  );
}
