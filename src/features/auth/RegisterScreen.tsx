import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { registerWithEmail } from '../../lib/supabase/session';
import { getErrorMessage } from './errors';
import { authStyles } from './styles';

type Props = {
  onSwitchToLogin: () => void;
};

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    setPending(true);
    try {
      await registerWithEmail(email, password);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Text style={authStyles.heading}>Crear cuenta</Text>

      <View style={authStyles.form}>
        <TextInput
          style={authStyles.input}
          accessibilityLabel="Email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#98a2b3"
        />

        <TextInput
          style={authStyles.input}
          accessibilityLabel="Contrasena"
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
          placeholder="Contrasena"
          placeholderTextColor="#98a2b3"
        />

        <Pressable
          style={[
            authStyles.primaryButton,
            pending && authStyles.buttonDisabled,
          ]}
          onPress={() => {
            void handleSubmit();
          }}
          disabled={pending}
        >
          <Text style={authStyles.primaryButtonText}>
            {pending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Text>
        </Pressable>
      </View>

      <View style={authStyles.helperRow}>
        <Text style={authStyles.helperText}>Ya tenes cuenta? </Text>
        <Pressable onPress={onSwitchToLogin} disabled={pending} hitSlop={4}>
          <Text style={authStyles.linkText}>Ingresar</Text>
        </Pressable>
      </View>

      {message ? <Text style={authStyles.errorBanner}>{message}</Text> : null}
    </>
  );
}
