import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Target, TrendingUp, Upload, Edit } from 'lucide-react';

export default function Billings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetValue, setTargetValue] = useState('');
  const currentYear = new Date().getFullYear();

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

  const { data: targetData } = useQuery({
    queryKey: ['billing-target', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_targets')
        .select('*')
        .eq('year', currentYear)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  const targetMutation = useMutation({
    mutationFn: async (target: number) => {
      const { data: existing } = await supabase
        .from('billing_targets')
        .select('id')
        .eq('year', currentYear)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('billing_targets')
          .update({ target_gp: target, set_by_user_id: user?.id })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('billing_targets')
          .insert({ year: currentYear, target_gp: target, set_by_user_id: user?.id })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Target updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['billing-target'] });
      setIsEditingTarget(false);
      setTargetValue('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update target',
        variant: 'destructive',
      });
    },
  });

  // Fetch billing records
  const { data: billingRecords } = useQuery({
    queryKey: ['billing-records', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_records')
        .select(`
          *,
          profiles:user_id (
            id,
            name,
            role_type,
            team_id,
            teams:team_id (
              team_name
            )
          )
        `)
        .eq('year', currentYear);
      
      if (error) throw error;
      return data;
    },
  });

  const handleSaveTarget = () => {
    const value = parseFloat(targetValue);
    if (isNaN(value) || value <= 0) {
      toast({
        title: 'Invalid value',
        description: 'Please enter a valid target amount',
        variant: 'destructive',
      });
      return;
    }
    targetMutation.mutate(value);
  };

  // Calculate totals from billing records
  const totals = useMemo(() => {
    if (!billingRecords) return { revenue: 0, gp: 0, np: 0 };
    
    return billingRecords.reduce((acc, record) => ({
      revenue: acc.revenue + Number(record.revenue_gbp),
      gp: acc.gp + Number(record.gp_gbp),
      np: acc.np + Number(record.np_gbp),
    }), { revenue: 0, gp: 0, np: 0 });
  }, [billingRecords]);

  const topMetrics = {
    totalRevenue: totals.revenue,
    totalGP: totals.gp,
    totalNP: totals.np,
    targetGP: targetData?.target_gp || 0,
    remaining: (targetData?.target_gp || 0) - totals.gp,
  };

  const isCEO = userProfile?.role_type === 'CEO';

  // Calculate team stats
  const teamStats = useMemo(() => {
    if (!billingRecords) return [];
    
    const teams = new Map<string, { revenue: number; gp: number; np: number }>();
    
    billingRecords.forEach(record => {
      const profile = record.profiles as any;
      const teamName = profile?.teams?.team_name || 'No Team';
      
      if (!teams.has(teamName)) {
        teams.set(teamName, { revenue: 0, gp: 0, np: 0 });
      }
      
      const team = teams.get(teamName)!;
      team.revenue += Number(record.revenue_gbp);
      team.gp += Number(record.gp_gbp);
      team.np += Number(record.np_gbp);
    });
    
    return Array.from(teams.entries()).map(([name, data]) => ({
      team: name,
      revenue: data.revenue,
      gp: data.gp,
      np: data.np,
      percentage: totals.gp > 0 ? (data.gp / totals.gp) * 100 : 0,
    })).sort((a, b) => b.gp - a.gp);
  }, [billingRecords, totals.gp]);

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      BD: 'bg-blue-100 text-blue-800',
      DT: 'bg-green-100 text-green-800',
      '360': 'bg-purple-100 text-purple-800',
      Manager: 'bg-orange-100 text-orange-800',
      CEO: 'bg-red-100 text-red-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const roleGroups = ['BD', 'DT', '360', 'Manager', 'CEO'];
  
  const getLeaderboardByRole = (role: string) => {
    if (!billingRecords) return [];
    
    // Aggregate billing records by user for this role
    const userMap = new Map<string, any>();
    
    billingRecords.forEach(record => {
      const profile = record.profiles as any;
      if (profile?.role_type !== role) return;
      
      const userId = record.user_id;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          name: profile.name,
          roleType: profile.role_type,
          teamName: profile.teams?.team_name || 'No Team',
          billings: 0,
        });
      }
      
      userMap.get(userId)!.billings += Number(record.gp_gbp);
    });
    
    return Array.from(userMap.values()).sort((a, b) => b.billings - a.billings);
  };

  const renderRoleLeaderboard = (role: string) => {
    const roleUsers = getLeaderboardByRole(role);
    
    if (roleUsers.length === 0) return null;

    return (
      <Card key={role}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant="outline" className={getRoleColor(role)}>
              {role}
            </Badge>
            Billings
          </CardTitle>
          <CardDescription>
            {roleUsers.length} {roleUsers.length === 1 ? 'member' : 'members'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Billings to Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roleUsers.map((user: any) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="font-medium">{user.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleColor(user.roleType)}>
                      {user.roleType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.teamName}</TableCell>
                  <TableCell className="text-right font-semibold text-accent">
                    £{user.billings.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-primary" />
            Billings
          </h1>
          <p className="text-muted-foreground">
            Track actual team billings and performance
          </p>
        </div>
        <Button onClick={() => navigate('/billings/upload')}>
          <Upload className="h-4 w-4 mr-2" />
          Upload CSV
        </Button>
      </div>

      {/* Top Metrics Section */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed (Revenue)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{topMetrics.totalRevenue.toLocaleString('en-GB')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed (GP)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{topMetrics.totalGP.toLocaleString('en-GB')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed (NP)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{topMetrics.totalNP.toLocaleString('en-GB')}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target GP</CardTitle>
            <div className="flex gap-2">
              {isCEO && !isEditingTarget && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setIsEditingTarget(true);
                    setTargetValue(topMetrics.targetGP.toString());
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {isEditingTarget && isCEO ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder="Enter target GP"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveTarget}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingTarget(false);
                      setTargetValue('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-2xl font-bold">£{topMetrics.targetGP.toLocaleString('en-GB')}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining to Target</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{topMetrics.remaining.toLocaleString('en-GB')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Stats Section */}
      <Card>
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
          <CardDescription>Performance breakdown by team</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="data-table-header">
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">GP</TableHead>
                <TableHead className="text-right">NP</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No billing data available yet. Upload CSV files to see team statistics.
                  </TableCell>
                </TableRow>
              ) : (
                teamStats.map((team) => (
                  <TableRow key={team.team} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{team.team}</TableCell>
                    <TableCell className="text-right">£{team.revenue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right">£{team.gp.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right">£{team.np.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                    <TableCell className="text-right">{team.percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Individual Leaderboards by Role */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Individual Billings by Role</h2>
        {roleGroups.map(role => renderRoleLeaderboard(role))}
        
        {roleGroups.every(role => getLeaderboardByRole(role).length === 0) && (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-muted-foreground">No billing data available yet. Upload CSV to populate.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
