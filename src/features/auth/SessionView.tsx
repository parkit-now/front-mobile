import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { signOut } from '../../lib/supabase/session';
import { getErrorMessage } from './errors';
import { authStyles } from './styles';

type Props = {
  session: Session;
};

export function SessionView({ session }: Props) {
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSignOut() {
    setMessage('');
    setPendingSignOut(true);
    try {
      await signOut();
    } catch (error) {
      setMessage(getErrorMessage(error));
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

      {message ? <Text style={authStyles.errorBanner}>{message}</Text> : null}
    </>
  );
}
