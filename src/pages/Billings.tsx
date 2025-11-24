import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Target, TrendingUp } from 'lucide-react';

export default function Billings() {
  // Placeholder data - will be replaced with actual data from CSV uploads
  const topMetrics = {
    totalRevenue: 0,
    totalGP: 0,
    totalNP: 0,
    targetGP: 0,
    remaining: 0,
  };

  const teamStats = [
    { team: 'KG-2', revenue: 0, gp: 0, np: 0, percentage: 0 },
    { team: 'DS-9', revenue: 0, gp: 0, np: 0, percentage: 0 },
    { team: 'Drill Max', revenue: 0, gp: 0, np: 0, percentage: 0 },
    { team: 'Ras Tanura', revenue: 0, gp: 0, np: 0, percentage: 0 },
    { team: 'Prelude', revenue: 0, gp: 0, np: 0, percentage: 0 },
  ];

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
    // Placeholder - will be populated with actual data
    return [];
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-primary" />
          Billings
        </h1>
        <p className="text-muted-foreground">
          Track actual team billings and performance
        </p>
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{topMetrics.targetGP.toLocaleString('en-GB')}</div>
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
              {teamStats.map((team) => (
                <TableRow key={team.team} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{team.team}</TableCell>
                  <TableCell className="text-right">£{team.revenue.toLocaleString('en-GB')}</TableCell>
                  <TableCell className="text-right">£{team.gp.toLocaleString('en-GB')}</TableCell>
                  <TableCell className="text-right">£{team.np.toLocaleString('en-GB')}</TableCell>
                  <TableCell className="text-right">{team.percentage}%</TableCell>
                </TableRow>
              ))}
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
