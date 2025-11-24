import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BillingsUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isCorrection, setIsCorrection] = useState(false);
  const [correctionReason, setCorrectionReason] = useState('');
  const currentYear = new Date().getFullYear();

  const { data: uploads } = useQuery({
    queryKey: ['billing-uploads', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_uploads')
        .select('*')
        .eq('year', currentYear)
        .order('month', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ month, file, isCorrection, correctionReason }: { 
      month: number; 
      file: File; 
      isCorrection: boolean;
      correctionReason?: string;
    }) => {
      // Parse CSV file
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          complete: async (results) => {
            try {
              // Check if upload exists for this month
              const { data: existingUpload } = await supabase
                .from('billing_uploads')
                .select('id')
                .eq('month', month)
                .eq('year', currentYear)
                .eq('is_correction', false)
                .single();

              const { data, error } = await supabase
                .from('billing_uploads')
                .insert([{
                  month,
                  year: currentYear,
                  uploaded_by_user_id: user?.id,
                  file_name: file.name,
                  file_data: results.data as any,
                  is_correction: isCorrection,
                  correction_reason: isCorrection ? correctionReason : null,
                  replaced_upload_id: existingUpload?.id || null,
                }])
                .select()
                .single();

              if (error) throw error;
              resolve(data);
            } catch (err) {
              reject(err);
            }
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'CSV file uploaded successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['billing-uploads'] });
      setSelectedMonth(null);
      setIsCorrection(false);
      setCorrectionReason('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload CSV file',
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = (month: number, isCorrection: boolean) => {
    setSelectedMonth(month);
    setIsCorrection(isCorrection);
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (isCorrection && !correctionReason.trim()) {
        toast({
          title: 'Correction reason required',
          description: 'Please provide a reason for the correction',
          variant: 'destructive',
        });
        return;
      }

      uploadMutation.mutate({
        month,
        file,
        isCorrection,
        correctionReason: isCorrection ? correctionReason : undefined,
      });
    };
    input.click();
  };

  const hasUploadForMonth = (month: number) => {
    return uploads?.some(upload => upload.month === month && !upload.is_correction);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Upload className="h-8 w-8 text-primary" />
          Upload Billing Files
        </h1>
        <p className="text-muted-foreground">
          Upload monthly billing CSV files for {currentYear}
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload CSV files for each month. If you need to correct a previously uploaded file, 
          use the "Upload Correction" button and provide a reason for the correction.
        </AlertDescription>
      </Alert>

      {selectedMonth !== null && isCorrection && (
        <Card>
          <CardHeader>
            <CardTitle>Correction Reason Required</CardTitle>
            <CardDescription>
              Explain why you are replacing the file for {MONTHS[selectedMonth - 1]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="correction-reason">Correction Reason *</Label>
              <Textarea
                id="correction-reason"
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Explain why this file is being replaced..."
                rows={3}
              />
            </div>
            <Button
              onClick={() => {
                setSelectedMonth(null);
                setIsCorrection(false);
                setCorrectionReason('');
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MONTHS.map((month, index) => {
          const monthNumber = index + 1;
          const hasUpload = hasUploadForMonth(monthNumber);
          const upload = uploads?.find(u => u.month === monthNumber && !u.is_correction);

          return (
            <Card key={month}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {month}
                  {hasUpload && <CheckCircle className="h-5 w-5 text-success" />}
                </CardTitle>
                <CardDescription>
                  {hasUpload ? (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {upload?.file_name}
                      </div>
                      <div className="text-muted-foreground">
                        Uploaded: {new Date(upload?.uploaded_at || '').toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    'No file uploaded'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={() => handleFileUpload(monthNumber, false)}
                  disabled={uploadMutation.isPending}
                  className="w-full"
                  variant={hasUpload ? 'outline' : 'default'}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {hasUpload ? 'Re-upload' : 'Upload File'}
                </Button>
                {hasUpload && (
                  <Button
                    onClick={() => {
                      setSelectedMonth(monthNumber);
                      setIsCorrection(true);
                    }}
                    disabled={uploadMutation.isPending}
                    className="w-full"
                    variant="secondary"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Upload Correction
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
