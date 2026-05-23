import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useToast } from '../../lib/notifications/ToastProvider';
import { signOut } from '../../lib/supabase/session';
import { getErrorMessage } from './errors';
import { authStyles } from './styles';

type Props = {
  session: Session;
};

export function SessionView({ session }: Props) {
  const { showToast } = useToast();
  const [pendingSignOut, setPendingSignOut] = useState(false);

  async function handleSignOut() {
    setPendingSignOut(true);
    try {
      await signOut();
    } catch (error) {
      showToast({ message: getErrorMessage(error), kind: 'error' });
    } finally {
      setPendingSignOut(false);
    }
  }

  return (
    <>
      <Text style={authStyles.heading}>Welcome</Text>
      <Text style={authStyles.userPill}>
        {session.user.email ?? session.user.id}
      </Text>

      <Pressable
        style={[
          authStyles.signOutButton,
          pendingSignOut && authStyles.buttonDisabled,
        ]}
        onPress={() => {
          void handleSignOut();
        }}
        disabled={pendingSignOut}
      >
        <Text style={authStyles.signOutButtonText}>
          {pendingSignOut ? 'Cerrando...' : 'Cerrar sesion'}
        </Text>
      </Pressable>
    </>
  );
}
