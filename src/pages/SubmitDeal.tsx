import { useState, useEffect } from 'react';
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
import type { Tables } from '@/integrations/supabase/types';

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
  const [splitType, setSplitType] = useState<'BD' | 'BD_DT' | '360' | '360_DT'>('BD');
  const [currency, setCurrency] = useState<string>('GBP');
  const [gpDaily, setGpDaily] = useState<string>('');
  const [durationDays, setDurationDays] = useState<string>('');
  const [estimatedDays12Months, setEstimatedDays12Months] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<number>(1);
  const [isFetchingRate, setIsFetchingRate] = useState(false);
  const [bdRep, setBdRep] = useState<string>('');
  const [dtRep, setDtRep] = useState<string>('');
  const [rep360, setRep360] = useState<string>('');
  const [profiles, setProfiles] = useState<Tables<'profiles'>[]>([]);
  const [serviceValue, setServiceValue] = useState<string>('');
  
  const calculatedValue = gpDaily && durationDays 
    ? (parseFloat(gpDaily) * parseInt(durationDays)).toFixed(2)
    : '';

  const gbpValue = calculatedValue && exchangeRate
    ? (parseFloat(calculatedValue) * exchangeRate).toFixed(2)
    : '';

  const serviceGbpValue = serviceValue && exchangeRate
    ? (parseFloat(serviceValue) * exchangeRate).toFixed(2)
    : '';

  const totalEstimatedOpportunity = gpDaily && estimatedDays12Months && exchangeRate
    ? (parseFloat(gpDaily) * parseInt(estimatedDays12Months) * exchangeRate).toFixed(2)
    : '';

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
      case 'GBP': return '£';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'SAR': return '﷼';
      case 'AED': return 'د.إ';
      default: return '';
    }
  };

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (!error && data) {
        setProfiles(data);
      }
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      if (currency === 'GBP') {
        setExchangeRate(1);
        return;
      }

      setIsFetchingRate(true);
      try {
        const response = await fetch(
          `https://api.exchangerate-api.com/v4/latest/${currency}`
        );
        const data = await response.json();
        if (data.rates && data.rates.GBP) {
          setExchangeRate(data.rates.GBP);
        }
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
        toast({
          variant: 'destructive',
          title: 'Exchange rate error',
          description: 'Could not fetch current exchange rate',
        });
      } finally {
        setIsFetchingRate(false);
      }
    };

    fetchExchangeRate();
  }, [currency, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, asDraft: boolean) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      const originalValue = parseFloat(formData.get('valueOriginalCurrency') as string);
      const convertedGbpValue = dealType === 'Service' 
        ? parseFloat(serviceGbpValue || '0')
        : parseFloat(gbpValue || '0');

      const dealData: any = {
        deal_type: dealType,
        client: formData.get('client') as string,
        location: formData.get('location') as string,
        currency: formData.get('currency') as string,
        value_original_currency: originalValue,
        value_converted_gbp: convertedGbpValue,
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
        dealData.bd_user_id = bdRep;
        dealData.bd_percent = 100;
      } else if (splitType === 'BD_DT') {
        dealData.bd_user_id = bdRep;
        dealData.bd_percent = 70;
        dealData.dt_user_id = dtRep;
        dealData.dt_percent = 30;
      } else if (splitType === '360') {
        dealData.user_360_id = rep360;
        dealData.percent_360 = 100;
      } else if (splitType === '360_DT') {
        dealData.user_360_id = rep360;
        dealData.percent_360 = 70;
        dealData.dt_user_id = dtRep;
        dealData.dt_percent = 30;
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
                    <Label htmlFor="currency">Currency *</Label>
                    <Select 
                      name="currency" 
                      value={currency}
                      onValueChange={setCurrency}
                      required
                    >
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
                    <Label htmlFor="gpDaily">
                      GP Daily ({currency === 'GBP' ? '£' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'SAR' ? '﷼' : 'د.إ'}) *
                    </Label>
                    <Input 
                      id="gpDaily" 
                      name="gpDaily" 
                      type="number" 
                      step="0.01"
                      value={gpDaily}
                      onChange={(e) => setGpDaily(e.target.value)}
                      required 
                    />
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="durationDays">Duration (Days, max 90) *</Label>
                    <Select 
                      name="durationDays" 
                      value={durationDays}
                      onValueChange={setDurationDays}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 90 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueOriginalCurrency">Value (Original Currency) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(currency)}
                      </span>
                      <Input 
                        id="valueOriginalCurrency" 
                        name="valueOriginalCurrency" 
                        type="number"
                        step="0.01"
                        value={calculatedValue}
                        readOnly
                        className="bg-muted pl-8"
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gbpValue">GBP Value</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                      <Input 
                        id="gbpValue" 
                        type="number"
                        step="0.01"
                        value={gbpValue}
                        readOnly
                        className="bg-muted pl-8"
                        placeholder={isFetchingRate ? "Fetching rate..." : "Auto-calculated"}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDays12Months">Total Estimated Days (Next 12 Months)</Label>
                    <Input 
                      id="estimatedDays12Months" 
                      name="estimatedDays12Months" 
                      type="number"
                      value={estimatedDays12Months}
                      onChange={(e) => setEstimatedDays12Months(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalEstimatedOpportunity">Total Estimated Opportunity Value</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        £
                      </span>
                      <Input 
                        id="totalEstimatedOpportunity" 
                        type="number"
                        step="0.01"
                        value={totalEstimatedOpportunity}
                        readOnly
                        className="bg-muted pl-8"
                        placeholder="Auto-calculated"
                      />
                    </div>
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
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency *</Label>
                    <Select 
                      name="currency" 
                      value={currency}
                      onValueChange={setCurrency}
                      required
                    >
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
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(currency)}
                      </span>
                      <Input 
                        id="valueOriginalCurrency" 
                        name="valueOriginalCurrency" 
                        type="number"
                        step="0.01"
                        value={serviceValue}
                        onChange={(e) => setServiceValue(e.target.value)}
                        className="pl-8"
                        required 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="serviceGbpValue">GBP Value</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                      <Input 
                        id="serviceGbpValue" 
                        type="number"
                        step="0.01"
                        value={serviceGbpValue}
                        readOnly
                        className="bg-muted pl-8"
                        placeholder={isFetchingRate ? "Fetching rate..." : "Auto-calculated"}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* GP Split */}
            <div className="space-y-4">
              <Label>GP Split *</Label>
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
                {dealType !== 'Service' && (
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="BD_DT" id="bd_dt" />
                    <Label htmlFor="bd_dt" className="font-normal cursor-pointer flex-1">
                      BD + DT Split (70% / 30%)
                    </Label>
                  </div>
                )}
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="360" id="360" />
                  <Label htmlFor="360" className="font-normal cursor-pointer flex-1">
                    360 (100%)
                  </Label>
                </div>
                {dealType !== 'Service' && (
                  <div className="flex items-center space-x-2 border rounded-lg p-3">
                    <RadioGroupItem value="360_DT" id="360_dt" />
                    <Label htmlFor="360_dt" className="font-normal cursor-pointer flex-1">
                      360 + DT Split (70% / 30%)
                    </Label>
                  </div>
                )}
              </RadioGroup>

              {/* Team Section */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">Team</Label>
                
                {splitType === 'BD' && (
                  <div className="space-y-2">
                    <Label htmlFor="bdRep">BD Rep *</Label>
                    <Select value={bdRep} onValueChange={setBdRep} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select BD Rep" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles
                          .filter(p => p.role_type === 'BD')
                          .map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {splitType === 'BD_DT' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="bdRep">BD Rep *</Label>
                      <Select value={bdRep} onValueChange={setBdRep} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select BD Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles
                            .filter(p => p.role_type === 'BD')
                            .map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dtRep">DT Rep *</Label>
                      <Select value={dtRep} onValueChange={setDtRep} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select DT Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles
                            .filter(p => p.role_type === 'DT')
                            .map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {splitType === '360' && (
                  <div className="space-y-2">
                    <Label htmlFor="rep360">360 Rep *</Label>
                    <Select value={rep360} onValueChange={setRep360} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select 360 Rep" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles
                          .filter(p => p.role_type === '360')
                          .map(profile => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {splitType === '360_DT' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rep360">360 Rep *</Label>
                      <Select value={rep360} onValueChange={setRep360} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select 360 Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles
                            .filter(p => p.role_type === '360')
                            .map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dtRep">DT Rep *</Label>
                      <Select value={dtRep} onValueChange={setDtRep} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select DT Rep" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles
                            .filter(p => p.role_type === 'DT')
                            .map(profile => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
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
