import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, TrendingUp, Award, Medal } from 'lucide-react';

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      // Fetch all users with their profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*, teams(team_name)')
        .eq('active', true);

      if (profilesError) throw profilesError;

      // Fetch all approved deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'Approved');

      if (dealsError) throw dealsError;

      // Calculate metrics for each user
      const userMetrics = profiles?.map((profile) => {
        // Filter deals where user is involved in the split
        const userDeals = deals?.filter((deal) => 
          deal.bd_user_id === profile.id ||
          deal.dt_user_id === profile.id ||
          deal.user_360_id === profile.id
        ) || [];

        // Calculate GP Added (excluding renewals)
        const gpAdded = userDeals
          .filter((deal) => !deal.is_renewal)
          .reduce((sum, deal) => {
            let percent = 0;
            if (deal.bd_user_id === profile.id) percent = deal.bd_percent || 0;
            if (deal.dt_user_id === profile.id) percent = deal.dt_percent || 0;
            if (deal.user_360_id === profile.id) percent = deal.percent_360 || 0;
            return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
          }, 0);

        // Count new placements (non-renewal deals)
        const newPlacements = userDeals.filter((deal) => !deal.is_renewal).length;

        // Count renewals
        const renewalCount = userDeals.filter((deal) => deal.is_renewal).length;

        return {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          roleType: profile.role_type,
          teamName: profile.teams?.team_name || 'No Team',
          gpAdded,
          newPlacements,
          renewalCount,
        };
      }) || [];

      // Sort by GP Added (descending)
      return userMetrics.sort((a, b) => b.gpAdded - a.gpAdded);
    },
  });

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-warning" />;
    if (index === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      BD: 'bg-blue-100 text-blue-800',
      DT: 'bg-green-100 text-green-800',
      '360': 'bg-purple-100 text-purple-800',
      Manager: 'bg-orange-100 text-orange-800',
      CEO: 'bg-red-100 text-red-800',
      Admin: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          Individual Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Performance rankings based on GP Added
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rankings</CardTitle>
          <CardDescription>
            Current year performance metrics for all active team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="data-table-header">
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">GP Added</TableHead>
                  <TableHead className="text-right">New Placements</TableHead>
                  <TableHead className="text-right">Renewals</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((user, index) => (
                    <TableRow key={user.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {getRankIcon(index)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getRoleColor(user.roleType)}>
                          {user.roleType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.teamName}</TableCell>
                      <TableCell className="text-right font-semibold text-accent">
                        £{user.gpAdded.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">{user.newPlacements}</TableCell>
                      <TableCell className="text-right">{user.renewalCount}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No data available yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
