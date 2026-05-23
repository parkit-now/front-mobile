import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { requestPasswordReset } from '../../lib/api/auth';
import { translateApiError } from '../../lib/api/translate';
import { useToast } from '../../lib/notifications/ToastProvider';
import { authStyles } from './styles';
import { validateEmail, type FieldErrors } from './validation';

type Props = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: Props) {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }
    setErrors({});
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (error) {
      showToast({
        message: translateApiError(error, { endpoint: 'auth.forgotPassword' }),
        kind: 'error',
      });
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <>
        <Text style={authStyles.heading}>Revisá tu email</Text>
        <Text style={authStyles.muted}>
          Si la dirección está registrada, te enviamos un link para elegir una
          nueva contraseña. Abrilo desde tu navegador para terminar el cambio.
        </Text>
        <Pressable style={authStyles.primaryButton} onPress={onBackToLogin}>
          <Text style={authStyles.primaryButtonText}>
            Volver a iniciar sesión
          </Text>
        </Pressable>
      </>
    );
  }

  return (
    <>
      <Text style={authStyles.heading}>Recuperá tu contraseña</Text>
      <Text style={authStyles.muted}>
        Ingresá el email con el que te registraste y te enviaremos un link para
        elegir una nueva contraseña.
      </Text>

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
            {pending ? 'Enviando...' : 'Enviar link'}
          </Text>
        </Pressable>
      </View>

      <View style={authStyles.helperRow}>
        <Pressable onPress={onBackToLogin} disabled={pending} hitSlop={4}>
          <Text style={authStyles.linkText}>Volver a iniciar sesión</Text>
        </Pressable>
      </View>
    </>
  );
}
