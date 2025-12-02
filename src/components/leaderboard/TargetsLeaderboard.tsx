import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type ViewPeriod = 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';

export default function TargetsLeaderboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewPeriod, setViewPeriod] = useState<ViewPeriod>('yearly');
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  const { data, isLoading } = useQuery({
    queryKey: ['targets-leaderboard', selectedYear],
    queryFn: async () => {
      // Fetch all profiles with teams
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams(id, team_name)')
        .eq('active', true);

      if (profilesError) throw profilesError;

      // Fetch all individual targets for the year
      const { data: targets, error: targetsError } = await supabase
        .from('individual_targets')
        .select('*')
        .eq('year', selectedYear);

      if (targetsError) throw targetsError;

      // Fetch all approved deals for GP Added
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .in('status', ['Submitted', 'Under Review', 'Approved'])
        .eq('submitted_year', selectedYear);

      if (dealsError) throw dealsError;

      // Fetch approved deals only for actual GP
      const { data: approvedDeals, error: approvedError } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'Approved')
        .eq('submitted_year', selectedYear);

      if (approvedError) throw approvedError;

      return { profiles, targets, deals, approvedDeals };
    },
  });

  const getMonthsForPeriod = (period: ViewPeriod, periodNum: number): number[] => {
    switch (period) {
      case 'monthly':
        return [periodNum];
      case 'quarterly':
        const qStart = (periodNum - 1) * 3 + 1;
        return [qStart, qStart + 1, qStart + 2];
      case 'half-yearly':
        return periodNum === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12];
      case 'yearly':
        return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
  };

  const calculateMetrics = (userId: string, months: number[]) => {
    if (!data) return { target: 0, actual: 0, projected: 0 };

    // Calculate target for the period
    const userTargets = data.targets?.filter(t => t.user_id === userId && months.includes(t.month)) || [];
    const target = userTargets.reduce((sum, t) => sum + Number(t.target_gp), 0);

    // Calculate actual GP Added (approved deals only)
    const actualDeals = data.approvedDeals?.filter((deal) => {
      const dealMonth = deal.submitted_month;
      const isUserDeal = deal.bd_user_id === userId || deal.dt_user_id === userId || deal.user_360_id === userId;
      return isUserDeal && dealMonth && months.includes(dealMonth);
    }) || [];

    const actual = actualDeals.reduce((sum, deal) => {
      let percent = 0;
      if (deal.bd_user_id === userId) percent = deal.bd_percent || 0;
      if (deal.dt_user_id === userId) percent = deal.dt_percent || 0;
      if (deal.user_360_id === userId) percent = deal.percent_360 || 0;
      return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
    }, 0);

    // Calculate projected (all pipeline deals)
    const projectedDeals = data.deals?.filter((deal) => {
      const dealMonth = deal.submitted_month;
      const isUserDeal = deal.bd_user_id === userId || deal.dt_user_id === userId || deal.user_360_id === userId;
      return isUserDeal && dealMonth && months.includes(dealMonth);
    }) || [];

    const projected = projectedDeals.reduce((sum, deal) => {
      let percent = 0;
      if (deal.bd_user_id === userId) percent = deal.bd_percent || 0;
      if (deal.dt_user_id === userId) percent = deal.dt_percent || 0;
      if (deal.user_360_id === userId) percent = deal.percent_360 || 0;
      
      const dealValue = deal.total_estimated_opportunity_gbp 
        ? Number(deal.total_estimated_opportunity_gbp)
        : Number(deal.value_converted_gbp) || 0;
      
      return sum + dealValue * (percent / 100);
    }, 0);

    return { target, actual, projected };
  };

  const calculateTeamMetrics = (teamId: string, months: number[]) => {
    if (!data) return { target: 0, actual: 0, projected: 0, memberCount: 0 };

    const teamMembers = data.profiles?.filter(p => p.team_id === teamId) || [];
    const memberIds = teamMembers.map(m => m.id);

    let target = 0;
    let actual = 0;
    let projected = 0;

    memberIds.forEach(userId => {
      const metrics = calculateMetrics(userId, months);
      target += metrics.target;
      actual += metrics.actual;
      projected += metrics.projected;
    });

    return { target, actual, projected, memberCount: teamMembers.length };
  };

  const months = getMonthsForPeriod(viewPeriod, selectedPeriod);

  const individualData = data?.profiles?.map(profile => {
    const metrics = calculateMetrics(profile.id, months);
    const variance = metrics.target > 0 ? ((metrics.actual - metrics.target) / metrics.target) * 100 : 0;
    const projectedVariance = metrics.target > 0 ? ((metrics.projected - metrics.target) / metrics.target) * 100 : 0;
    
    return {
      id: profile.id,
      name: profile.name,
      roleType: (profile as any).sales_role || profile.role_type,
      teamName: profile.teams?.team_name || 'No Team',
      ...metrics,
      variance,
      projectedVariance,
      progress: metrics.target > 0 ? (metrics.actual / metrics.target) * 100 : 0,
    };
  }).sort((a, b) => b.actual - a.actual) || [];

  // Get unique teams
  const teams = [...new Set(data?.profiles?.map(p => p.team_id).filter(Boolean))] as string[];
  const teamData = teams.map(teamId => {
    const team = data?.profiles?.find(p => p.team_id === teamId)?.teams;
    const metrics = calculateTeamMetrics(teamId, months);
    const variance = metrics.target > 0 ? ((metrics.actual - metrics.target) / metrics.target) * 100 : 0;
    const projectedVariance = metrics.target > 0 ? ((metrics.projected - metrics.target) / metrics.target) * 100 : 0;

    return {
      id: teamId,
      teamName: team?.team_name || 'Unknown',
      ...metrics,
      variance,
      projectedVariance,
      progress: metrics.target > 0 ? (metrics.actual / metrics.target) * 100 : 0,
    };
  }).sort((a, b) => b.actual - a.actual);

  const getPeriodOptions = () => {
    switch (viewPeriod) {
      case 'monthly':
        return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      case 'quarterly':
        return ['Q1', 'Q2', 'Q3', 'Q4'];
      case 'half-yearly':
        return ['H1', 'H2'];
      case 'yearly':
        return ['Full Year'];
    }
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (variance < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 5) return 'text-green-600';
    if (variance < -5) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const periodOptions = getPeriodOptions();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">View Period</label>
              <Select value={viewPeriod} onValueChange={(v) => { setViewPeriod(v as ViewPeriod); setSelectedPeriod(1); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {viewPeriod !== 'yearly' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Period</label>
                <Select value={selectedPeriod.toString()} onValueChange={(v) => setSelectedPeriod(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map((option, index) => (
                      <SelectItem key={index} value={(index + 1).toString()}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="individual" className="space-y-6">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Individual vs Target
                </CardTitle>
                <CardDescription>
                  {individualData.length} team members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header">
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Actual GP Added</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      {viewPeriod === 'yearly' && (
                        <>
                          <TableHead className="text-right">Projected</TableHead>
                          <TableHead className="text-right">Proj. Variance</TableHead>
                        </>
                      )}
                      <TableHead className="w-32">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {individualData.map((user) => (
                      <TableRow key={user.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.roleType}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{user.teamName}</TableCell>
                        <TableCell className="text-right">
                          £{user.target.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          £{user.actual.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${getVarianceColor(user.variance)}`}>
                            {getVarianceIcon(user.variance)}
                            {user.variance >= 0 ? '+' : ''}{user.variance.toFixed(1)}%
                          </div>
                        </TableCell>
                        {viewPeriod === 'yearly' && (
                          <>
                            <TableCell className="text-right font-semibold text-primary">
                              £{user.projected.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={`flex items-center justify-end gap-1 ${getVarianceColor(user.projectedVariance)}`}>
                                {getVarianceIcon(user.projectedVariance)}
                                {user.projectedVariance >= 0 ? '+' : ''}{user.projectedVariance.toFixed(1)}%
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(user.progress, 100)} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10">
                              {user.progress.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          {isLoading ? (
            <Card>
              <CardContent className="py-8">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team vs Target
                </CardTitle>
                <CardDescription>
                  {teamData.length} teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="data-table-header">
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Members</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Actual GP Added</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      {viewPeriod === 'yearly' && (
                        <>
                          <TableHead className="text-right">Projected</TableHead>
                          <TableHead className="text-right">Proj. Variance</TableHead>
                        </>
                      )}
                      <TableHead className="w-32">Progress</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamData.map((team) => (
                      <TableRow key={team.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{team.teamName}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {team.memberCount}
                        </TableCell>
                        <TableCell className="text-right">
                          £{team.target.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-accent">
                          £{team.actual.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`flex items-center justify-end gap-1 ${getVarianceColor(team.variance)}`}>
                            {getVarianceIcon(team.variance)}
                            {team.variance >= 0 ? '+' : ''}{team.variance.toFixed(1)}%
                          </div>
                        </TableCell>
                        {viewPeriod === 'yearly' && (
                          <>
                            <TableCell className="text-right font-semibold text-primary">
                              £{team.projected.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className={`flex items-center justify-end gap-1 ${getVarianceColor(team.projectedVariance)}`}>
                                {getVarianceIcon(team.projectedVariance)}
                                {team.projectedVariance >= 0 ? '+' : ''}{team.projectedVariance.toFixed(1)}%
                              </div>
                            </TableCell>
                          </>
                        )}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(team.progress, 100)} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-10">
                              {team.progress.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
