import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Calendar, DollarSign, User, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState('');

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

  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingDeals, isLoading } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .in('status', ['Submitted', 'Under Review'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: ['Manager', 'CEO', 'Admin'].includes(userProfile?.role_type || ''),
  });

  const getProfileName = (userId: string | null) => {
    if (!userId || !profiles) return 'Unassigned';
    const profile = profiles.find(p => p.id === userId);
    return profile?.name || 'Unknown';
  };

  const approveMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase
        .from('deals')
        .update({
          status: 'Approved',
          approved_by_user_id: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Deal approved',
        description: 'The deal has been successfully approved',
      });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ dealId, comment }: { dealId: string; comment: string }) => {
      const { error } = await supabase
        .from('deals')
        .update({
          status: 'Revision Required',
          revision_comment: comment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dealId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Revision requested',
        description: 'The deal has been sent back for revision',
      });
      setIsRejectDialogOpen(false);
      setSelectedDeal(null);
      setRejectionComment('');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const handleApprove = (dealId: string) => {
    approveMutation.mutate(dealId);
  };

  const handleReject = (deal: any) => {
    setSelectedDeal(deal);
    setIsRejectDialogOpen(true);
  };

  const confirmReject = () => {
    if (!rejectionComment.trim()) {
      toast({
        variant: 'destructive',
        title: 'Comment required',
        description: 'Please provide a reason for requesting revision',
      });
      return;
    }
    rejectMutation.mutate({ dealId: selectedDeal.id, comment: rejectionComment });
  };

  const getDealTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Staff: 'bg-blue-100 text-blue-800',
      Contract: 'bg-green-100 text-green-800',
      Service: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!['Manager', 'CEO', 'Admin'].includes(userProfile?.role_type || '')) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Access Denied</p>
          <p className="text-muted-foreground text-center">
            You don't have permission to view this page
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckCircle className="h-8 w-8 text-primary" />
            Approvals & Rejections
          </h1>
          <p className="text-muted-foreground">
            Review and approve or reject submitted deals
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="h-48 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : pendingDeals && pendingDeals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingDeals.map((deal) => (
              <Card key={deal.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{deal.client}</CardTitle>
                      <CardDescription className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getDealTypeColor(deal.deal_type)}>
                          {deal.deal_type}
                        </Badge>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800">
                          {deal.status}
                        </Badge>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="truncate">{getProfileName(deal.submitted_by_user_id)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(deal.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{deal.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {deal.currency} {Number(deal.value_original_currency).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {deal.deal_type === 'Contract' && deal.duration_days && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{deal.duration_days} days</span>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">GP Split:</span>
                      <div className="mt-1 space-y-1 text-muted-foreground">
                        {deal.bd_percent > 0 && (
                          <div>BD ({deal.bd_percent}%): {getProfileName(deal.bd_user_id)}</div>
                        )}
                        {deal.dt_percent > 0 && (
                          <div>DT ({deal.dt_percent}%): {getProfileName(deal.dt_user_id)}</div>
                        )}
                        {deal.percent_360 > 0 && (
                          <div>360 ({deal.percent_360}%): {getProfileName(deal.user_360_id)}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleApprove(deal.id)}
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-destructive hover:text-destructive"
                      onClick={() => handleReject(deal)}
                      disabled={rejectMutation.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Request Revision
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No pending approvals</p>
              <p className="text-muted-foreground text-center">
                There are no deals waiting for approval at the moment
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Please provide a reason for requesting revision on this deal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter your revision comments here..."
              value={rejectionComment}
              onChange={(e) => setRejectionComment(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmReject} disabled={rejectMutation.isPending}>
              Send for Revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
