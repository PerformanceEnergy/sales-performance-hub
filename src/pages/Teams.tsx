import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp } from 'lucide-react';

export default function Teams() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams-performance'],
    queryFn: async () => {
      // Fetch teams with their members
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*, profiles(id, name, role_type)')
        .eq('active', true);

      if (teamsError) throw teamsError;

      // Fetch all approved deals
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'Approved');

      if (dealsError) throw dealsError;

      // Calculate metrics for each team
      const teamMetrics = teamsData?.map((team) => {
        const memberIds = team.profiles?.map((p: any) => p.id) || [];
        
        // Filter deals where team members are involved
        const teamDeals = deals?.filter((deal) => 
          memberIds.includes(deal.bd_user_id) ||
          memberIds.includes(deal.dt_user_id) ||
          memberIds.includes(deal.user_360_id)
        ) || [];

        // Calculate total GP Added
        const gpAdded = teamDeals
          .filter((deal) => !deal.is_renewal)
          .reduce((sum, deal) => {
            let percent = 0;
            if (memberIds.includes(deal.bd_user_id)) percent += (deal.bd_percent || 0);
            if (memberIds.includes(deal.dt_user_id)) percent += (deal.dt_percent || 0);
            if (memberIds.includes(deal.user_360_id)) percent += (deal.percent_360 || 0);
            return sum + (Number(deal.value_converted_gbp) || 0) * (percent / 100);
          }, 0);

        const newPlacements = teamDeals.filter((deal) => !deal.is_renewal).length;
        const renewalCount = teamDeals.filter((deal) => deal.is_renewal).length;

        return {
          id: team.id,
          teamName: team.team_name,
          description: team.description,
          memberCount: team.profiles?.length || 0,
          members: team.profiles || [],
          gpAdded,
          newPlacements,
          renewalCount,
        };
      }) || [];

      return teamMetrics.sort((a, b) => b.gpAdded - a.gpAdded);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Team Performance
        </h1>
        <p className="text-muted-foreground">
          Overview of team rankings and statistics
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {teams.map((team, index) => (
            <Card key={team.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {index === 0 && <TrendingUp className="h-5 w-5 text-warning" />}
                      {team.teamName}
                    </CardTitle>
                    {team.description && (
                      <CardDescription>{team.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary">{team.memberCount} members</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="stat-label">GP Added</p>
                    <p className="text-xl font-bold text-accent">
                      £{team.gpAdded.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="stat-label">New Deals</p>
                    <p className="text-xl font-bold">{team.newPlacements}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="stat-label">Renewals</p>
                    <p className="text-xl font-bold">{team.renewalCount}</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="stat-label mb-2">Team Members</p>
                  <div className="flex flex-wrap gap-2">
                    {team.members.map((member: any) => (
                      <Badge key={member.id} variant="outline" className="text-xs">
                        {member.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No teams found</p>
            <p className="text-muted-foreground text-center">
              No teams have been created yet
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
