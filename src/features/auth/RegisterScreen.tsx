import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useToast } from '../../lib/notifications/ToastProvider';
import { registerWithEmail } from '../../lib/supabase/session';
import { mapAuthError } from './errors';
import { PasswordInput } from './PasswordInput';
import { authStyles } from './styles';
import {
  validateEmail,
  validateFullName,
  validatePassword,
  validatePasswordConfirmation,
  type FieldErrors,
} from './validation';

type Props = {
  onSwitchToLogin: () => void;
};

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    const next: FieldErrors = {};
    const nameError = validateFullName(name);
    if (nameError) next.name = nameError;
    const emailError = validateEmail(email);
    if (emailError) next.email = emailError;
    const passwordError = validatePassword(password, { isNew: true });
    if (passwordError) next.password = passwordError;
    const confirmationError = validatePasswordConfirmation(
      password,
      passwordConfirmation,
    );
    if (confirmationError) next.passwordConfirmation = confirmationError;
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await registerWithEmail(name, email, password);
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
            style={[authStyles.input, errors.name && authStyles.inputError]}
            accessibilityLabel="Nombre y apellido"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            maxLength={120}
            value={name}
            onChangeText={(value) => {
              setName(value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder="Nombre y apellido *"
            placeholderTextColor="#98a2b3"
          />
          {errors.name ? (
            <Text style={authStyles.fieldError}>{errors.name}</Text>
          ) : null}
        </View>

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
          ) : (
            <Text style={authStyles.fieldHint}>
              Ejemplo: nombre@ejemplo.com
            </Text>
          )}
        </View>

        <View style={authStyles.fieldGroup}>
          <PasswordInput
            mode="new"
            hasError={!!errors.password}
            accessibilityLabel="Contraseña"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
              if (
                errors.passwordConfirmation &&
                value === passwordConfirmation
              ) {
                setErrors((prev) => ({
                  ...prev,
                  passwordConfirmation: undefined,
                }));
              }
            }}
            placeholder="Contraseña (mín. 8 caracteres)"
          />
          {errors.password ? (
            <Text style={authStyles.fieldError}>{errors.password}</Text>
          ) : null}
        </View>

        <View style={authStyles.fieldGroup}>
          <PasswordInput
            mode="new"
            hasError={!!errors.passwordConfirmation}
            accessibilityLabel="Repetir contraseña"
            value={passwordConfirmation}
            onChangeText={(value) => {
              setPasswordConfirmation(value);
              if (errors.passwordConfirmation) {
                setErrors((prev) => ({
                  ...prev,
                  passwordConfirmation: undefined,
                }));
              }
            }}
            placeholder="Repetir contraseña *"
          />
          {errors.passwordConfirmation ? (
            <Text style={authStyles.fieldError}>
              {errors.passwordConfirmation}
            </Text>
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
