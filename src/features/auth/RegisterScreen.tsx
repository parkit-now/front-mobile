import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { RegisterRole } from '../../lib/api/auth';
import { registerWithEmail } from '../../lib/supabase/session';
import { getErrorMessage } from './errors';
import { authStyles } from './styles';

const ROLE_OPTIONS: Array<{ value: RegisterRole; label: string }> = [
  { value: 'driver', label: 'Conductor' },
  { value: 'operator', label: 'Operador' },
  { value: 'owner', label: 'Dueno' },
];

type Props = {
  onSwitchToLogin: () => void;
};

export function RegisterScreen({ onSwitchToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RegisterRole>('driver');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    setMessage('');
    setPending(true);
    try {
      await registerWithEmail(email, password, role);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Text style={authStyles.heading}>Crear cuenta</Text>
      <Text style={authStyles.muted}>Completa tus datos para empezar.</Text>

      <View style={authStyles.form}>
        <View>
          <Text style={authStyles.fieldLabel}>Email</Text>
          <TextInput
            style={authStyles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
            placeholder="jane.doe@parkit.com"
            placeholderTextColor="#98a2b3"
          />
        </View>

        <View>
          <Text style={authStyles.fieldLabel}>Contrasena</Text>
          <TextInput
            style={authStyles.input}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimo 8 caracteres"
            placeholderTextColor="#98a2b3"
          />
        </View>

        <View>
          <Text style={authStyles.fieldLabel}>Rol</Text>
          <View style={authStyles.rolePickerRow}>
            {ROLE_OPTIONS.map((option) => {
              const active = option.value === role;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    authStyles.roleChip,
                    active && authStyles.roleChipActive,
                  ]}
                  onPress={() => {
                    setRole(option.value);
                  }}
                  disabled={pending}
                >
                  <Text
                    style={[
                      authStyles.roleChipText,
                      active && authStyles.roleChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
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
        <Text style={authStyles.helperText}>Ya tenes cuenta? </Text>
        <Pressable onPress={onSwitchToLogin} disabled={pending} hitSlop={4}>
          <Text style={authStyles.linkText}>Ingresar</Text>
        </Pressable>
      </View>

      {message ? <Text style={authStyles.errorBanner}>{message}</Text> : null}
    </>
  );
}
