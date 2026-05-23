import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useToast } from '../../lib/notifications/ToastProvider';
import { registerWithEmail } from '../../lib/supabase/session';
import { mapAuthError } from './errors';
import { authStyles } from './styles';
import {
  validateEmail,
  validatePassword,
  type FieldErrors,
} from './validation';

type Props = {
  onSwitchToLogin: () => void;
};

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const next: FieldErrors = {};
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    const passwordError = validatePassword(password, { isNew: true });
    if (passwordError) next.password = passwordError;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await registerWithEmail(email, password);
    } catch (error) {
      const mapped = mapAuthError(error, 'register');
      if (mapped.fieldErrors) {
        setErrors(mapped.fieldErrors);
      }
      if (mapped.toastMessage) {
        showToast({ message: mapped.toastMessage, kind: 'error' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Text style={authStyles.heading}>Crear cuenta</Text>

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
          <TextInput
            style={[authStyles.input, errors.password && authStyles.inputError]}
            accessibilityLabel="Contraseña"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            placeholder="Contraseña (mín. 8 caracteres)"
            placeholderTextColor="#98a2b3"
          />
          {errors.password ? (
            <Text style={authStyles.fieldError}>{errors.password}</Text>
          ) : null}
        </View>

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
        <Text style={authStyles.helperText}>¿Ya tenés cuenta? </Text>
        <Pressable onPress={onSwitchToLogin} disabled={pending} hitSlop={4}>
          <Text style={authStyles.linkText}>Ingresar</Text>
        </Pressable>
      </View>
    </>
  );
}
