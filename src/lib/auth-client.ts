import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL, // Defaults to window.location.origin if undefined
  plugins: [magicLinkClient()],
});

export const {
  signIn,
  signOut,
  useSession,
} = authClient;
