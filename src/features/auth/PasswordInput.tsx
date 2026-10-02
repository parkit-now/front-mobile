import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { authStyles } from './styles';

function PasswordEyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"
        fill="none"
        stroke="#0e5fd8"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx={12}
        cy={12}
        r={3}
        fill="none"
        stroke="#0e5fd8"
        strokeWidth={1.9}
      />
      {!visible ? (
        <Line
          x1={4.5}
          y1={19.5}
          x2={19.5}
          y2={4.5}
          stroke="#0e5fd8"
          strokeWidth={2.1}
          strokeLinecap="round"
        />
      ) : null}
    </Svg>
  );
}

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  hasError?: boolean;
  /** 'new' for creation/confirmation fields, 'current' for login. */
  mode?: 'new' | 'current';
};

export function PasswordInput({
  hasError = false,
  mode = 'current',
  ...inputProps
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={authStyles.passwordInputWrap}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={mode === 'new' ? 'newPassword' : 'password'}
        autoComplete={mode === 'new' ? 'new-password' : 'current-password'}
        placeholderTextColor="#98a2b3"
        {...inputProps}
        secureTextEntry={!visible}
        style={[
          authStyles.input,
          authStyles.passwordInput,
          hasError && authStyles.inputError,
        ]}
      />
      <Pressable
        style={authStyles.passwordToggle}
        onPress={() => setVisible((current) => !current)}
        accessibilityRole="button"
        accessibilityLabel={
          visible ? 'Ocultar contraseña' : 'Mostrar contraseña'
        }
        accessibilityState={{ selected: visible }}
        hitSlop={8}
      >
        <PasswordEyeIcon visible={visible} />
      </Pressable>
    </View>
  );
}
