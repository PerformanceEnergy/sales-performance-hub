import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  BarChart3,
  ArrowRight,
  Trophy
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch user's profile to get role_type
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role_type')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch user's deals statistics and rankings
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, userProfile?.role_type],
    queryFn: async () => {
      // Get current user's deals
      const { data: deals, error } = await supabase
        .from('deals')
        .select('*')
        .eq('submitted_by_user_id', user?.id);

      if (error) throw error;

      const totalDeals = deals?.length || 0;
      const approvedDeals = deals?.filter(d => d.status === 'Approved').length || 0;
      const pendingDeals = deals?.filter(d => d.status === 'Submitted' || d.status === 'Under Review').length || 0;
      const draftDeals = deals?.filter(d => d.status === 'Draft').length || 0;
      const totalValue = deals
        ?.filter(d => d.status === 'Approved')
        .reduce((sum, d) => sum + (Number(d.value_converted_gbp) || 0), 0) || 0;

      // Get rankings among same role
      let rankings = { totalDeals: { rank: 0, total: 0 }, approvedDeals: { rank: 0, total: 0 }, pendingDeals: { rank: 0, total: 0 }, totalValue: { rank: 0, total: 0 } };
      
      if (userProfile?.role_type) {
        // Get all users with same role
        const { data: sameRoleUsers, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('role_type', userProfile.role_type);

        if (!profileError && sameRoleUsers) {
          const userIds = sameRoleUsers.map(p => p.id);
          
          // Get all deals for users with same role
          const { data: allDeals, error: dealsError } = await supabase
            .from('deals')
            .select('*')
            .in('submitted_by_user_id', userIds);

          if (!dealsError && allDeals) {
            // Calculate stats per user
            const userStats = userIds.map(userId => {
              const userDeals = allDeals.filter(d => d.submitted_by_user_id === userId);
              return {
                userId,
                totalDeals: userDeals.length,
                approvedDeals: userDeals.filter(d => d.status === 'Approved').length,
                pendingDeals: userDeals.filter(d => d.status === 'Submitted' || d.status === 'Under Review').length,
                totalValue: userDeals.filter(d => d.status === 'Approved').reduce((sum, d) => sum + (Number(d.value_converted_gbp) || 0), 0),
              };
            });

            // Calculate rankings
            const totalUsers = userStats.length;
            
            // Total deals ranking (descending)
            const sortedByTotal = [...userStats].sort((a, b) => b.totalDeals - a.totalDeals);
            const totalRank = sortedByTotal.findIndex(s => s.userId === user?.id) + 1;
            
            // Approved deals ranking (descending)
            const sortedByApproved = [...userStats].sort((a, b) => b.approvedDeals - a.approvedDeals);
            const approvedRank = sortedByApproved.findIndex(s => s.userId === user?.id) + 1;
            
            // Pending deals ranking (ascending - fewer is better)
            const sortedByPending = [...userStats].sort((a, b) => a.pendingDeals - b.pendingDeals);
            const pendingRank = sortedByPending.findIndex(s => s.userId === user?.id) + 1;
            
            // Total value ranking (descending)
            const sortedByValue = [...userStats].sort((a, b) => b.totalValue - a.totalValue);
            const valueRank = sortedByValue.findIndex(s => s.userId === user?.id) + 1;

            rankings = {
              totalDeals: { rank: totalRank, total: totalUsers },
              approvedDeals: { rank: approvedRank, total: totalUsers },
              pendingDeals: { rank: pendingRank, total: totalUsers },
              totalValue: { rank: valueRank, total: totalUsers },
            };
          }
        }
      }

      return {
        totalDeals,
        approvedDeals,
        pendingDeals,
        draftDeals,
        totalValue,
        rankings,
      };
    },
    enabled: !!user?.id && !!userProfile?.role_type,
  });

  const quickStats = [
    {
      title: 'Total Deals',
      value: stats?.totalDeals || 0,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      ranking: stats?.rankings?.totalDeals,
    },
    {
      title: 'Approved',
      value: stats?.approvedDeals || 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      ranking: stats?.rankings?.approvedDeals,
    },
    {
      title: 'Pending',
      value: stats?.pendingDeals || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      ranking: stats?.rankings?.pendingDeals,
    },
    {
      title: 'GP Added',
      value: `£${(stats?.totalValue || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      ranking: stats?.rankings?.totalValue,
    },
  ];

  const getRankingSuffix = (rank: number) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  const quickLinks = [
    {
      title: 'Submit New Deal',
      description: 'Create and submit a new deal for approval',
      icon: FileText,
      href: '/submit-deal',
      color: 'border-primary/20 hover:border-primary',
    },
    {
      title: 'View Leaderboard',
      description: 'Check individual and team rankings',
      icon: BarChart3,
      href: '/leaderboard',
      color: 'border-accent/20 hover:border-accent',
    },
    {
      title: 'Team Performance',
      description: 'Explore team statistics and metrics',
      icon: Users,
      href: '/teams',
      color: 'border-secondary/20 hover:border-secondary',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back!
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your performance
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          quickStats.map((stat) => {
            const Icon = stat.icon;
            const hasRanking = stat.ranking && stat.ranking.rank > 0 && stat.ranking.total > 0;
            return (
              <Card key={stat.title} className="metric-card relative">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="stat-label">{stat.title}</CardTitle>
                  <div className={`${stat.bgColor} rounded-lg p-2`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between">
                    <div className="stat-value">{stat.value}</div>
                    {hasRanking && (
                      <Badge variant="secondary" className="gap-1 text-xs font-semibold">
                        <Trophy className="h-3 w-3" />
                        {stat.ranking.rank}{getRankingSuffix(stat.ranking.rank)} of {stat.ranking.total}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.title} to={link.href}>
                <Card className={`transition-all hover:shadow-md ${link.color} cursor-pointer h-full`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted rounded-lg p-2">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <CardTitle className="text-lg">{link.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-2">{link.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" className="gap-2 p-0">
                      Get started <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      {stats && stats.draftDeals > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Pending Drafts
            </CardTitle>
            <CardDescription>
              You have {stats.draftDeals} draft deal{stats.draftDeals !== 1 ? 's' : ''} waiting to be submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/drafts">
              <Button variant="outline" className="gap-2">
                View Drafts <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
