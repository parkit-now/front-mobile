import { Image, Text, View } from 'react-native';
import logo from '../../../images/logo.jpeg';
import { authStyles } from './styles';

export function BrandHeader() {
  return (
    <View style={authStyles.brandLockup}>
      <Image
        source={logo}
        style={authStyles.brandBadge}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={authStyles.brandCopy}>
        <Text style={authStyles.title}>Parkit</Text>
      </View>
    </View>
  );
}
