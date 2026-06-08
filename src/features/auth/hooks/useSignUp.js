import { useState } from 'react';
import { supabase } from '@/config/supabase';

export function useSignUp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const signUp = async (email, password, fullName) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    if (error) setError(error.message);
    setLoading(false);
    return !error;
  };

  return { signUp, loading, error };
}