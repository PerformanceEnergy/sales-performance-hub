import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'BD' | 'DT' | '360' | 'Manager' | 'CEO' | 'Admin';

interface UserRole {
  role: AppRole;
}

export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<UserRole | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data as UserRole;
    },
    enabled: !!user?.id,
  });

  const isAdmin = data?.role ? ['Admin', 'Manager', 'CEO'].includes(data.role) : false;

  return {
    role: data?.role || null,
    isAdmin,
    isLoading,
    error,
  };
}
