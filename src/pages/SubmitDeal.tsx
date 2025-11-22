import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, FileText, Save, Send } from 'lucide-react';
import { z } from 'zod';

const dealSchema = z.object({
  dealType: z.enum(['Staff', 'Contract', 'Service']),
  client: z.string().min(1, 'Client is required'),
  location: z.string().min(1, 'Location is required'),
  currency: z.enum(['GBP', 'USD', 'EUR', 'SAR', 'AED']),
  valueOriginalCurrency: z.number().positive('Value must be positive'),
}).refine((data) => {
  // Add conditional validation based on deal type
  return true;
}, {
  message: 'Please fill all required fields for this deal type',
});

export default function SubmitDeal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [dealType, setDealType] = useState<'Staff' | 'Contract' | 'Service'>('Staff');
  const [splitType, setSplitType] = useState<'BD' | 'BD_DT' | '360'>('BD');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, asDraft: boolean) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const dealData: any = {
        deal_type: dealType,
        client: formData.get('client') as string,
        location: formData.get('location') as string,
        currency: formData.get('currency') as string,
        value_original_currency: parseFloat(formData.get('valueOriginalCurrency') as string),
        value_converted_gbp: parseFloat(formData.get('valueOriginalCurrency') as string), // TODO: Add FX conversion in Phase 2
        submitted_by_user_id: user?.id,
        status: asDraft ? 'Draft' : 'Submitted',
        submitted_month: new Date().getMonth() + 1,
        submitted_year: new Date().getFullYear(),
      };

      // Add conditional fields based on deal type
      if (dealType === 'Staff' || dealType === 'Contract') {
        dealData.placement_id = formData.get('placementId') as string;
        dealData.worker_name = formData.get('workerName') as string;
        dealData.gp_daily = parseFloat(formData.get('gpDaily') as string);
        dealData.duration_days = parseInt(formData.get('durationDays') as string);
      } else if (dealType === 'Service') {
        dealData.service_name = formData.get('serviceName') as string;
        dealData.service_description = formData.get('serviceDescription') as string;
      }

      // Add split information
      if (splitType === 'BD') {
        dealData.bd_user_id = user?.id;
        dealData.bd_percent = 100;
      } else if (splitType === 'BD_DT') {
        dealData.bd_user_id = user?.id;
        dealData.bd_percent = 70;
        // TODO: Add DT user selection in enhanced version
        dealData.dt_percent = 30;
      } else if (splitType === '360') {
        dealData.user_360_id = user?.id;
        dealData.percent_360 = 100;
      }

      const { error } = await supabase.from('deals').insert([dealData]);

      if (error) throw error;

      toast({
        title: asDraft ? 'Draft saved' : 'Deal submitted',
        description: asDraft 
          ? 'Your deal has been saved as a draft' 
          : 'Your deal has been submitted for approval',
      });

      navigate(asDraft ? '/drafts' : '/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Submit New Deal
        </h1>
        <p className="text-muted-foreground">
          Create a new deal submission for approval
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Deal Information
          </CardTitle>
          <CardDescription>
            Fill in the details below. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
            {/* Deal Type Selection */}
            <div className="space-y-2">
              <Label>Deal Type *</Label>
              <RadioGroup
                value={dealType}
                onValueChange={(value) => setDealType(value as any)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Staff" id="staff" />
                  <Label htmlFor="staff" className="font-normal cursor-pointer">Staff</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Contract" id="contract" />
                  <Label htmlFor="contract" className="font-normal cursor-pointer">Contract</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Service" id="service" />
                  <Label htmlFor="service" className="font-normal cursor-pointer">Service</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Basic Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client">Client *</Label>
                <Input id="client" name="client" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" name="location" required />
              </div>
            </div>

            {/* Conditional Fields for Staff/Contract */}
            {(dealType === 'Staff' || dealType === 'Contract') && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="placementId">Placement ID *</Label>
                    <Input id="placementId" name="placementId" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workerName">Worker Name *</Label>
                    <Input id="workerName" name="workerName" required />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gpDaily">GP Daily (£) *</Label>
                    <Input 
                      id="gpDaily" 
                      name="gpDaily" 
                      type="number" 
                      step="0.01"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationDays">Duration (Days, max 90) *</Label>
                    <Input 
                      id="durationDays" 
                      name="durationDays" 
                      type="number"
                      max="90"
                      required 
                    />
                  </div>
                </div>
              </>
            )}

            {/* Conditional Fields for Service */}
            {dealType === 'Service' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serviceName">Service Name *</Label>
                  <Input id="serviceName" name="serviceName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceDescription">Service Description</Label>
                  <Textarea 
                    id="serviceDescription" 
                    name="serviceDescription"
                    rows={4}
                  />
                </div>
              </>
            )}

            {/* Financial Information */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency *</Label>
                <Select name="currency" defaultValue="GBP" required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="SAR">SAR (﷼)</SelectItem>
                    <SelectItem value="AED">AED (د.إ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valueOriginalCurrency">Value (Original Currency) *</Label>
                <Input 
                  id="valueOriginalCurrency" 
                  name="valueOriginalCurrency" 
                  type="number"
                  step="0.01"
                  required 
                />
              </div>
            </div>

            {/* Credit Split */}
            <div className="space-y-2">
              <Label>Credit Split *</Label>
              <RadioGroup
                value={splitType}
                onValueChange={(value) => setSplitType(value as any)}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="BD" id="bd" />
                  <Label htmlFor="bd" className="font-normal cursor-pointer flex-1">
                    BD Only (100%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="BD_DT" id="bd_dt" />
                  <Label htmlFor="bd_dt" className="font-normal cursor-pointer flex-1">
                    BD + DT Split (70% / 30%)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="360" id="360" />
                  <Label htmlFor="360" className="font-normal cursor-pointer flex-1">
                    360 (100%)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={(e: any) => handleSubmit(e, true)}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2 flex-1"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <Send className="h-4 w-4" />
                Submit for Approval
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
