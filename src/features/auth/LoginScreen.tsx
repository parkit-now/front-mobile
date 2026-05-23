import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import {
  signInWithEmail,
  signInWithProvider,
} from '../../lib/supabase/session';
import { getErrorMessage } from './errors';
import { ProviderIcon, type SocialProvider } from './ProviderIcon';
import { authStyles } from './styles';

type OAuthOption = {
  provider: SocialProvider;
  label: string;
};

const OAUTH_OPTIONS: OAuthOption[] = [
  { provider: 'google', label: 'Continuar con Google' },
  { provider: 'github', label: 'Continuar con GitHub' },
];

type Props = {
  onSwitchToRegister: () => void;
};

export function LoginScreen({ onSwitchToRegister }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingEmail, setPendingEmail] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );
  const [message, setMessage] = useState('');

  async function handleEmailSubmit() {
    setMessage('');
    setPendingEmail(true);
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPendingEmail(false);
    }
  }

  async function handleProvider(provider: SocialProvider) {
    setMessage('');
    setPendingProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPendingProvider(null);
    }
  }

  const anyPending = pendingEmail || pendingProvider !== null;

  return (
    <>
      <Text style={authStyles.heading}>Iniciar sesion</Text>

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
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          placeholder="Contrasena"
          placeholderTextColor="#98a2b3"
        />

        <Pressable
          style={[
            authStyles.primaryButton,
            anyPending && authStyles.buttonDisabled,
          ]}
          onPress={() => {
            void handleEmailSubmit();
          }}
          disabled={anyPending}
        >
          <Text style={authStyles.primaryButtonText}>
            {pendingEmail ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </Pressable>
      </View>

      <View style={authStyles.helperRow}>
        <Text style={authStyles.helperText}>No tenes cuenta? </Text>
        <Pressable
          onPress={onSwitchToRegister}
          disabled={anyPending}
          hitSlop={4}
        >
          <Text style={authStyles.linkText}>Crear una</Text>
        </Pressable>
      </View>

      <View style={authStyles.divider} accessibilityElementsHidden>
        <View style={authStyles.dividerLine} />
        <Text style={authStyles.dividerLabel}>O</Text>
        <View style={authStyles.dividerLine} />
      </View>

      <View style={authStyles.oauthList}>
        {OAUTH_OPTIONS.map((option) => (
          <Pressable
            key={option.provider}
            style={[
              authStyles.oauthButton,
              anyPending && authStyles.buttonDisabled,
            ]}
            onPress={() => {
              void handleProvider(option.provider);
            }}
            disabled={anyPending}
          >
            <ProviderIcon provider={option.provider} />
            <Text style={authStyles.oauthButtonText}>
              {pendingProvider === option.provider
                ? 'Redirigiendo...'
                : option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {message ? <Text style={authStyles.errorBanner}>{message}</Text> : null}
    </>
  );
}
