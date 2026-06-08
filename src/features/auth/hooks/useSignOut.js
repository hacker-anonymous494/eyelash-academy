import { supabase } from '@/config/supabase';
import useAuthStore from '../store';

export function useSignOut() {
  const signOutStore = useAuthStore((state) => state.signOut);

  const signOut = async () => {
    await supabase.auth.signOut();
    signOutStore();
  };

  return { signOut };
}