import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function Drafts() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: drafts, isLoading, refetch } = useQuery({
    queryKey: ['drafts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('submitted_by_user_id', user?.id)
        .in('status', ['Draft', 'Revision Required'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Draft deleted',
        description: 'The draft has been removed',
      });

      refetch();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    }
  };

  const getDealTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      Staff: 'bg-blue-100 text-blue-800',
      Contract: 'bg-green-100 text-green-800',
      Service: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          My Drafts
        </h1>
        <p className="text-muted-foreground">
          Review and edit your draft deals before submission
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="h-32 bg-muted/50" />
            </Card>
          ))}
        </div>
      ) : drafts && drafts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {drafts.map((draft) => (
            <Card key={draft.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{draft.client}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Badge variant="outline" className={getDealTypeColor(draft.deal_type)}>
                        {draft.deal_type}
                      </Badge>
                      {draft.status === 'Revision Required' && (
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          Revision Required
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(draft.created_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>
                      {draft.currency} {Number(draft.value_original_currency).toLocaleString()}
                    </span>
                  </div>
                </div>

                {draft.status === 'Revision Required' && draft.revision_comment && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm font-medium text-warning mb-1">Revision Comment:</p>
                    <p className="text-sm text-muted-foreground">{draft.revision_comment}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Edit Draft
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(draft.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No drafts found</p>
            <p className="text-muted-foreground text-center mb-4">
              You don't have any draft deals at the moment
            </p>
            <Button onClick={() => window.location.href = '/submit-deal'}>
              Create New Deal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
