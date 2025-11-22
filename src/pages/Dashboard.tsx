import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Users,
  BarChart3,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch user's deals statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
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

      return {
        totalDeals,
        approvedDeals,
        pendingDeals,
        draftDeals,
        totalValue,
      };
    },
  });

  const quickStats = [
    {
      title: 'Total Deals',
      value: stats?.totalDeals || 0,
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Approved',
      value: stats?.approvedDeals || 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending',
      value: stats?.pendingDeals || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'GP Added',
      value: `£${(stats?.totalValue || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

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
            return (
              <Card key={stat.title} className="metric-card">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="stat-label">{stat.title}</CardTitle>
                  <div className={`${stat.bgColor} rounded-lg p-2`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="stat-value">{stat.value}</div>
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
