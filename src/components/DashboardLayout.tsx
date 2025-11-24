import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  TrendingUp, 
  Home, 
  FileText, 
  BarChart3, 
  Users, 
  LogOut, 
  User,
  FileCheck,
  LineChart,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Submit Deal', href: '/submit-deal', icon: FileText },
  { name: 'My Drafts', href: '/drafts', icon: FileCheck },
  { name: 'Approvals', href: '/approvals', icon: CheckCircle },
  { name: 'Leaderboard', href: '/leaderboard', icon: BarChart3 },
  { name: 'Teams', href: '/teams', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: LineChart },
  { name: 'Admin', href: '/admin', icon: User },
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const { data: userProfile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingCount } = useQuery({
    queryKey: ['pending-approvals-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Submitted', 'Under Review']);

      if (error) throw error;
      return count || 0;
    },
    enabled: ['Manager', 'CEO', 'Admin'].includes(userProfile?.role_type || ''),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <TrendingUp className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Performance Energy</h1>
                <p className="text-xs text-muted-foreground">Sales Board</p>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                const showBadge = item.href === '/approvals' && pendingCount && pendingCount > 0;
                
                return (
                  <Link key={item.name} to={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className={cn(
                        'gap-2 relative',
                        isActive && 'bg-secondary text-secondary-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                      {showBadge && (
                        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold">
                          {pendingCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.user_metadata?.name || 'User'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
