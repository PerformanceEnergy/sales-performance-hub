import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Users, Pencil, FileEdit } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

export default function Admin() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<Tables<'profiles'>[]>([]);
  const [teams, setTeams] = useState<Tables<'teams'>[]>([]);
  const [deals, setDeals] = useState<Tables<'deals'>[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_type: 'BD' as 'BD' | 'DT' | '360',
    team_id: ''
  });

  const [editData, setEditData] = useState<{
    id: string;
    name: string;
    role_type: string;
    sales_role: string;
    team_id: string;
  } | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);

  const [editDealData, setEditDealData] = useState<{
    id: string;
    estimated_days_12_months: number | null;
    total_estimated_opportunity_gbp: number | null;
  } | null>(null);

  const [isEditDealOpen, setIsEditDealOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, teamsRes, dealsRes] = await Promise.all([
      supabase.from('profiles').select('*, teams(team_name)').order('name'),
      supabase.from('teams').select('*').eq('active', true).order('team_name'),
      supabase.from('deals').select('*').order('created_at', { ascending: false })
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
    if (dealsRes.data) setDeals(dealsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: 'User created',
        description: `${formData.name} has been added successfully`
      });

      setFormData({
        name: '',
        email: '',
        password: '',
        role_type: 'BD',
        team_id: ''
      });

      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (profile: Tables<'profiles'>) => {
    setEditData({
      id: profile.id,
      name: profile.name,
      role_type: profile.role_type,
      sales_role: (profile as any).sales_role || '',
      team_id: profile.team_id || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editData) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: editData.id,
          name: editData.name,
          role_type: editData.role_type,
          sales_role: editData.sales_role || null,
          team_id: editData.team_id
        }
      });

      if (error) throw error;

      toast({
        title: 'User updated',
        description: `${editData.name} has been updated successfully`
      });

      setIsEditOpen(false);
      setEditData(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDeal = (deal: Tables<'deals'>) => {
    setEditDealData({
      id: deal.id,
      estimated_days_12_months: deal.estimated_days_12_months,
      total_estimated_opportunity_gbp: deal.total_estimated_opportunity_gbp,
    });
    setIsEditDealOpen(true);
  };

  const handleUpdateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDealData) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('deals')
        .update({
          estimated_days_12_months: editDealData.estimated_days_12_months,
          total_estimated_opportunity_gbp: editDealData.total_estimated_opportunity_gbp,
        })
        .eq('id', editDealData.id);

      if (error) throw error;

      toast({
        title: 'Deal updated',
        description: 'Deal projection values updated successfully'
      });

      setIsEditDealOpen(false);
      setEditDealData(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'BD': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'DT': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case '360': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'Submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'Rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Administration
        </h1>
        <p className="text-muted-foreground">
          Manage users, teams, and deals
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">

      <div className="grid gap-6 md:grid-cols-2">
        {/* Create User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </CardTitle>
            <CardDescription>
              Add a new user and assign them to a team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role_type">Role *</Label>
                <Select
                  value={formData.role_type}
                  onValueChange={(value) => setFormData({ ...formData, role_type: value as any })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BD">BD</SelectItem>
                    <SelectItem value="DT">DT</SelectItem>
                    <SelectItem value="360">360</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="CEO">CEO</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="team_id">Team *</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) => setFormData({ ...formData, team_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create User
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Users
            </CardTitle>
            <CardDescription>
              {profiles.length} user{profiles.length !== 1 ? 's' : ''} in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    profiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell className="font-medium">{profile.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role_type)}`}>
                            {profile.role_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {(profile as any).teams?.team_name || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and team assignment
            </DialogDescription>
          </DialogHeader>
          {editData && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={editData.role_type}
                  onValueChange={(value) => setEditData({ ...editData, role_type: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BD">BD</SelectItem>
                    <SelectItem value="DT">DT</SelectItem>
                    <SelectItem value="360">360</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="CEO">CEO</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sales-role">Sales Board Role</Label>
                <Select
                  value={editData.sales_role}
                  onValueChange={(value) => setEditData({ ...editData, sales_role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Same as Permission Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Same as Permission Role</SelectItem>
                    <SelectItem value="BD">BD</SelectItem>
                    <SelectItem value="DT">DT</SelectItem>
                    <SelectItem value="360">360</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Override which role this user appears as on sales boards and leaderboards
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-team">Team *</Label>
                <Select
                  value={editData.team_id}
                  onValueChange={(value) => setEditData({ ...editData, team_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update User
                </Button>
              </div>
            </form>
          )}
          </DialogContent>
        </Dialog>
        </TabsContent>

        <TabsContent value="deals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                All Deals
              </CardTitle>
              <CardDescription>
                {deals.length} deal{deals.length !== 1 ? 's' : ''} in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">GBP Value</TableHead>
                      <TableHead className="text-right">Estimated Opp.</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deals.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No deals found
                        </TableCell>
                      </TableRow>
                    ) : (
                      deals.map((deal) => (
                        <TableRow key={deal.id}>
                          <TableCell className="font-medium">{deal.client}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{deal.deal_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(deal.status || 'Draft')}`}>
                              {deal.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            £{Number(deal.value_converted_gbp || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell className="text-right">
                            {deal.total_estimated_opportunity_gbp 
                              ? `£${Number(deal.total_estimated_opportunity_gbp).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditDeal(deal)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Deal Dialog */}
      <Dialog open={isEditDealOpen} onOpenChange={setIsEditDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Deal Projections</DialogTitle>
            <DialogDescription>
              Update estimated opportunity values for this deal
            </DialogDescription>
          </DialogHeader>
          {editDealData && (
            <form onSubmit={handleUpdateDeal} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="estimated-days">Estimated Days (Next 12 Months)</Label>
                <Input
                  id="estimated-days"
                  type="number"
                  value={editDealData.estimated_days_12_months || ''}
                  onChange={(e) => setEditDealData({ 
                    ...editDealData, 
                    estimated_days_12_months: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="Enter days"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated-opportunity">Total Estimated Opportunity (GBP)</Label>
                <Input
                  id="estimated-opportunity"
                  type="number"
                  step="0.01"
                  value={editDealData.total_estimated_opportunity_gbp || ''}
                  onChange={(e) => setEditDealData({ 
                    ...editDealData, 
                    total_estimated_opportunity_gbp: e.target.value ? parseFloat(e.target.value) : null 
                  })}
                  placeholder="Enter GBP amount"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDealOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Deal
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
