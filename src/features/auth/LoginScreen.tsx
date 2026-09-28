import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useToast } from '../../lib/notifications/ToastProvider';
import {
  signInWithEmail,
  signInWithProvider,
} from '../../lib/supabase/session';
import { getErrorMessage, mapAuthError } from './errors';
import { ProviderIcon, type SocialProvider } from './ProviderIcon';
import { authStyles } from './styles';
import {
  validateEmail,
  validatePassword,
  type FieldErrors,
} from './validation';

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
  onForgotPassword: () => void;
};

export function LoginScreen({ onSwitchToRegister, onForgotPassword }: Props) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pendingEmail, setPendingEmail] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider | null>(
    null,
  );

  async function handleEmailSubmit() {
    const next: FieldErrors = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    const passwordError = validatePassword(password);
    if (passwordError) next.password = passwordError;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setPendingEmail(true);
    try {
      await signInWithEmail(email, password);
    } catch (error) {
      const mapped = mapAuthError(error, 'login');
      if (mapped.fieldErrors) {
        setErrors(mapped.fieldErrors);
      }
      if (mapped.toastMessage) {
        showToast({ message: mapped.toastMessage, kind: 'error' });
      }
    } finally {
      setPendingEmail(false);
    }
  }

  async function handleProvider(provider: SocialProvider) {
    setPendingProvider(provider);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      showToast({ message: getErrorMessage(error), kind: 'error' });
    } finally {
      setPendingProvider(null);
    }
  }

  const anyPending = pendingEmail || pendingProvider !== null;

  return (
    <>
      <Text style={authStyles.heading}>Iniciar sesión</Text>

      <View style={authStyles.form}>
        <View style={authStyles.fieldGroup}>
          <TextInput
            style={[authStyles.input, errors.email && authStyles.inputError]}
            accessibilityLabel="Email"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            placeholder="Email"
            placeholderTextColor="#98a2b3"
          />
          {errors.email ? (
            <Text style={authStyles.fieldError}>{errors.email}</Text>
          ) : null}
        </View>

        <View style={authStyles.fieldGroup}>
          <View style={authStyles.passwordInputWrap}>
            <TextInput
              style={[
                authStyles.input,
                authStyles.passwordInput,
                errors.password && authStyles.inputError,
              ]}
              accessibilityLabel="Contraseña"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              textContentType="password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="Contraseña"
              placeholderTextColor="#98a2b3"
            />
            <Pressable
              style={authStyles.passwordToggle}
              onPress={() => setShowPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
              }
              accessibilityState={{ selected: showPassword }}
              hitSlop={8}
            >
              <PasswordEyeIcon visible={showPassword} />
            </Pressable>
          </View>
          {errors.password ? (
            <Text style={authStyles.fieldError}>{errors.password}</Text>
          ) : null}
        </View>

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
        <Pressable onPress={onForgotPassword} disabled={anyPending} hitSlop={4}>
          <Text style={authStyles.linkText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
      </View>

      <View style={authStyles.helperRow}>
        <Text style={authStyles.helperText}>¿No tenés cuenta? </Text>
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
    </>
  );
}
