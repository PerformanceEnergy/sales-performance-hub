import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, Users, TrendingUp, DollarSign, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

type TimePeriod = 'month' | 'quarter' | 'half' | 'year';
type ViewType = 'individual' | 'team' | 'role';

export default function ManagersAnalytics() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [viewType, setViewType] = useState<ViewType>('team');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Check if user has manager access
  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const hasManagerAccess = userProfile?.role_type === 'Manager' || 
                          userProfile?.role_type === 'CEO' || 
                          userProfile?.role_type === 'Admin';

  // Fetch all data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['managers-analytics'],
    queryFn: async () => {
      const [profilesRes, dealsRes, teamsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('active', true),
        supabase.from('deals').select('*').eq('status', 'Approved'),
        supabase.from('teams').select('*').eq('active', true),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (teamsRes.error) throw teamsRes.error;

      return {
        profiles: profilesRes.data,
        deals: dealsRes.data,
        teams: teamsRes.data,
      };
    },
    enabled: hasManagerAccess,
  });

  // Calculate date ranges based on selected period
  const getDateRange = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    let startDate = new Date(currentYear, 0, 1); // Default: start of year
    
    switch (timePeriod) {
      case 'month':
        startDate = new Date(currentYear, currentMonth, 1);
        break;
      case 'quarter':
        const currentQuarter = Math.floor(currentMonth / 3);
        startDate = new Date(currentYear, currentQuarter * 3, 1);
        break;
      case 'half':
        const half = currentMonth < 6 ? 0 : 6;
        startDate = new Date(currentYear, half, 1);
        break;
      case 'year':
        startDate = new Date(currentYear, 0, 1);
        break;
    }
    
    return { startDate, endDate: now };
  };

  // Filter deals by date range
  const filteredDeals = useMemo(() => {
    if (!analyticsData?.deals) return [];
    const { startDate, endDate } = getDateRange();
    
    return analyticsData.deals.filter(deal => {
      const dealDate = new Date(deal.created_at);
      return dealDate >= startDate && dealDate <= endDate;
    });
  }, [analyticsData?.deals, timePeriod]);

  // Calculate team performance
  const teamPerformance = useMemo(() => {
    if (!analyticsData?.teams || !analyticsData?.profiles) return [];
    
    return analyticsData.teams.map(team => {
      const teamMembers = analyticsData.profiles.filter(p => p.team_id === team.id);
      const memberIds = teamMembers.map(m => m.id);
      
      const teamDeals = filteredDeals.filter(deal =>
        memberIds.includes(deal.bd_user_id) ||
        memberIds.includes(deal.dt_user_id) ||
        memberIds.includes(deal.user_360_id)
      );
      
      const gpAdded = teamDeals
        .filter(d => !d.is_renewal)
        .reduce((sum, deal) => {
          let percent = 0;
          if (memberIds.includes(deal.bd_user_id)) percent += (deal.bd_percent || 0);
          if (memberIds.includes(deal.dt_user_id)) percent += (deal.dt_percent || 0);
          if (memberIds.includes(deal.user_360_id)) percent += (deal.percent_360 || 0);
          return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
        }, 0);
      
      return {
        name: team.team_name,
        gpAdded,
        deals: teamDeals.filter(d => !d.is_renewal).length,
        renewals: teamDeals.filter(d => d.is_renewal).length,
      };
    }).sort((a, b) => b.gpAdded - a.gpAdded);
  }, [analyticsData, filteredDeals]);

  // Calculate individual performance
  const individualPerformance = useMemo(() => {
    if (!analyticsData?.profiles) return [];
    
    let profiles = analyticsData.profiles;
    if (selectedTeam !== 'all') {
      profiles = profiles.filter(p => p.team_id === selectedTeam);
    }
    
    return profiles.map(profile => {
      const userDeals = filteredDeals.filter(deal =>
        deal.bd_user_id === profile.id ||
        deal.dt_user_id === profile.id ||
        deal.user_360_id === profile.id
      );
      
      const gpAdded = userDeals
        .filter(d => !d.is_renewal)
        .reduce((sum, deal) => {
          let percent = 0;
          if (deal.bd_user_id === profile.id) percent = deal.bd_percent || 0;
          if (deal.dt_user_id === profile.id) percent = deal.dt_percent || 0;
          if (deal.user_360_id === profile.id) percent = deal.percent_360 || 0;
          return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
        }, 0);
      
      return {
        name: profile.name,
        role: profile.role_type,
        gpAdded,
        deals: userDeals.filter(d => !d.is_renewal).length,
        renewals: userDeals.filter(d => d.is_renewal).length,
      };
    }).sort((a, b) => b.gpAdded - a.gpAdded);
  }, [analyticsData, filteredDeals, selectedTeam]);

  // Calculate role performance
  const rolePerformance = useMemo(() => {
    if (!analyticsData?.profiles) return [];
    
    const roleGroups = ['BD', 'DT', '360', 'Manager', 'CEO', 'Admin'];
    
    return roleGroups.map(role => {
      const roleProfiles = analyticsData.profiles.filter(p => p.role_type === role);
      const roleIds = roleProfiles.map(p => p.id);
      
      const roleDeals = filteredDeals.filter(deal =>
        roleIds.includes(deal.bd_user_id) ||
        roleIds.includes(deal.dt_user_id) ||
        roleIds.includes(deal.user_360_id)
      );
      
      const gpAdded = roleDeals
        .filter(d => !d.is_renewal)
        .reduce((sum, deal) => {
          let percent = 0;
          if (roleIds.includes(deal.bd_user_id)) percent += (deal.bd_percent || 0);
          if (roleIds.includes(deal.dt_user_id)) percent += (deal.dt_percent || 0);
          if (roleIds.includes(deal.user_360_id)) percent += (deal.percent_360 || 0);
          return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
        }, 0);
      
      return {
        name: role,
        gpAdded,
        deals: roleDeals.filter(d => !d.is_renewal).length,
        members: roleProfiles.length,
      };
    }).filter(r => r.members > 0).sort((a, b) => b.gpAdded - a.gpAdded);
  }, [analyticsData, filteredDeals]);

  // Calculate monthly trends
  const monthlyTrends = useMemo(() => {
    if (!filteredDeals.length) return [];
    
    const monthsData: Record<string, { month: string; gpAdded: number; deals: number }> = {};
    
    filteredDeals.forEach(deal => {
      const date = new Date(deal.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthsData[monthKey]) {
        monthsData[monthKey] = {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          gpAdded: 0,
          deals: 0,
        };
      }
      
      if (!deal.is_renewal) {
        monthsData[monthKey].gpAdded += Number(deal.value_converted_gbp) || 0;
        monthsData[monthKey].deals += 1;
      }
    });
    
    return Object.values(monthsData).sort((a, b) => a.month.localeCompare(b.month));
  }, [filteredDeals]);

  // Calculate projection
  const projection = useMemo(() => {
    if (monthlyTrends.length === 0) return 0;
    const avgMonthly = monthlyTrends.reduce((sum, m) => sum + m.gpAdded, 0) / monthlyTrends.length;
    const remainingMonths = 12 - new Date().getMonth();
    const currentTotal = filteredDeals
      .filter(d => !d.is_renewal)
      .reduce((sum, d) => sum + (Number(d.value_converted_gbp) || 0), 0);
    return currentTotal + (avgMonthly * remainingMonths);
  }, [monthlyTrends, filteredDeals]);

  if (isLoadingProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!hasManagerAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Managers Analytics</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page. This page is only available to Managers, CEOs, and Admins.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalGP = filteredDeals
    .filter(d => !d.is_renewal)
    .reduce((sum, d) => sum + (Number(d.value_converted_gbp) || 0), 0);
  const totalDeals = filteredDeals.filter(d => !d.is_renewal).length;
  const totalRenewals = filteredDeals.filter(d => d.is_renewal).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Managers Analytics
          </h1>
          <p className="text-muted-foreground">
            Performance insights and trends across teams, individuals, and roles
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Period</label>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Current Month</SelectItem>
                  <SelectItem value="quarter">Current Quarter</SelectItem>
                  <SelectItem value="half">Current Half Year</SelectItem>
                  <SelectItem value="year">Current Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">View By</label>
              <Select value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {viewType === 'individual' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Filter</label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Teams</SelectItem>
                    {analyticsData?.teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total GP Added</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              £{totalGP.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRenewals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year Projection</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              £{projection.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on current average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trend</CardTitle>
          <CardDescription>GP Added over time</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
              />
              <Legend />
              <Line type="monotone" dataKey="gpAdded" stroke="#8884d8" strokeWidth={2} name="GP Added" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by View Type */}
      <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
        <TabsList>
          <TabsTrigger value="team">Team Performance</TabsTrigger>
          <TabsTrigger value="individual">Individual Performance</TabsTrigger>
          <TabsTrigger value="role">Role Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Team GP Added</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
                    />
                    <Bar dataKey="gpAdded" fill="#8884d8" name="GP Added" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Deal Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={teamPerformance}
                      dataKey="deals"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {teamPerformance.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
              <CardDescription>Individual GP Added (Top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={individualPerformance.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
                  />
                  <Legend />
                  <Bar dataKey="gpAdded" fill="#82ca9d" name="GP Added" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Role Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rolePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => `£${value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`}
                    />
                    <Bar dataKey="gpAdded" fill="#FFBB28" name="GP Added" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Deal Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rolePerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="deals" fill="#FF8042" name="Deals" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
