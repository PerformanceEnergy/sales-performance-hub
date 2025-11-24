import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, Save } from 'lucide-react';

export default function Projections() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [editedValues, setEditedValues] = useState<Record<string, any>>({});

  // Fetch user profile
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

  // Fetch approved deals for the current year
  const { data: deals } = useQuery({
    queryKey: ['projection-deals', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .eq('status', 'Approved')
        .eq('submitted_year', currentYear);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch projection adjustments
  const { data: adjustments } = useQuery({
    queryKey: ['projection-adjustments', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projection_adjustments')
        .select('*')
        .eq('year', currentYear);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch billing records
  const { data: billingRecords } = useQuery({
    queryKey: ['billing-records', currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billing_records')
        .select('*')
        .eq('year', currentYear);
      
      if (error) throw error;
      return data;
    },
  });

  // Save adjustment mutation
  const saveMutation = useMutation({
    mutationFn: async ({ dealId, valueThisYear, mobilisationDate }: any) => {
      const { data, error } = await supabase
        .from('projection_adjustments')
        .upsert({
          deal_id: dealId,
          year: currentYear,
          value_this_year_gbp: valueThisYear,
          expected_mobilisation_date: mobilisationDate,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Projection updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['projection-adjustments'] });
      setEditedValues({});
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update projection',
        variant: 'destructive',
      });
    },
  });

  const isManager = ['Manager', 'CEO', 'Admin'].includes(userProfile?.role_type || '');

  // Separate deals by type
  const serviceDeals = useMemo(() => deals?.filter(d => d.deal_type === 'Service') || [], [deals]);
  const staffDeals = useMemo(() => deals?.filter(d => d.deal_type === 'Staff') || [], [deals]);
  const contractDeals = useMemo(() => deals?.filter(d => d.deal_type === 'Contract') || [], [deals]);

  // Get adjustment for a deal
  const getAdjustment = (dealId: string) => {
    return adjustments?.find(a => a.deal_id === dealId);
  };

  // Handle input change
  const handleValueChange = (dealId: string, field: string, value: any) => {
    setEditedValues(prev => ({
      ...prev,
      [dealId]: {
        ...prev[dealId],
        [field]: value,
      },
    }));
  };

  // Save adjustment for a deal
  const handleSave = (dealId: string, dealType: string) => {
    const edited = editedValues[dealId];
    if (!edited) return;

    saveMutation.mutate({
      dealId,
      valueThisYear: edited.valueThisYear ? parseFloat(edited.valueThisYear) : null,
      mobilisationDate: dealType === 'Contract' ? edited.mobilisationDate : null,
    });
  };

  // Calculate total billings GP
  const totalBillingsGP = useMemo(() => {
    if (!billingRecords) return 0;
    return billingRecords.reduce((sum, record) => sum + Number(record.gp_gbp), 0);
  }, [billingRecords]);

  // Calculate total projected values
  const projectionTotals = useMemo(() => {
    let servicesTotal = 0;
    let staffTotal = 0;
    let contractsTotal = 0;

    serviceDeals.forEach(deal => {
      const adjustment = getAdjustment(deal.id);
      const valueThisYear = adjustment?.value_this_year_gbp || editedValues[deal.id]?.valueThisYear || 0;
      servicesTotal += Number(valueThisYear);
    });

    staffDeals.forEach(deal => {
      staffTotal += Number(deal.value_converted_gbp || 0);
    });

    contractDeals.forEach(deal => {
      const adjustment = getAdjustment(deal.id);
      const valueThisYear = adjustment?.value_this_year_gbp || editedValues[deal.id]?.valueThisYear || 0;
      contractsTotal += Number(valueThisYear);
    });

    return {
      services: servicesTotal,
      staff: staffTotal,
      contracts: contractsTotal,
      billings: totalBillingsGP,
      total: servicesTotal + staffTotal + contractsTotal + totalBillingsGP,
    };
  }, [serviceDeals, staffDeals, contractDeals, totalBillingsGP, adjustments, editedValues]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Projections
          </h1>
          <p className="text-muted-foreground">
            Year-end GP projections based on deals and actual billings
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{projectionTotals.services.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{projectionTotals.staff.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{projectionTotals.contracts.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actual Billings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{projectionTotals.billings.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
        <Card className="bg-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Projection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">£{projectionTotals.total.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</div>
          </CardContent>
        </Card>
      </div>

      {/* Services Section */}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>Service contracts with manual value adjustments for current year</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead className="text-right">Submission Value (GBP)</TableHead>
                <TableHead className="text-right">Value This Year</TableHead>
                <TableHead className="text-right">Remaining Value</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 6 : 5} className="text-center text-muted-foreground py-8">
                    No service deals found
                  </TableCell>
                </TableRow>
              ) : (
                serviceDeals.map(deal => {
                  const adjustment = getAdjustment(deal.id);
                  const submissionValue = Number(deal.value_converted_gbp || 0);
                  const valueThisYear = editedValues[deal.id]?.valueThisYear !== undefined 
                    ? Number(editedValues[deal.id].valueThisYear)
                    : Number(adjustment?.value_this_year_gbp || 0);
                  const remainingValue = submissionValue - valueThisYear;

                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.client}</TableCell>
                      <TableCell>{deal.service_name || '-'}</TableCell>
                      <TableCell className="text-right">£{submissionValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">
                        {isManager ? (
                          <Input
                            type="number"
                            className="w-32 text-right"
                            value={valueThisYear}
                            onChange={(e) => handleValueChange(deal.id, 'valueThisYear', e.target.value)}
                          />
                        ) : (
                          `£${valueThisYear.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">£{remainingValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSave(deal.id, 'Service')}
                            disabled={!editedValues[deal.id]}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Staff Section */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Placements</CardTitle>
          <CardDescription>Staff placements counted in full</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Worker Name</TableHead>
                <TableHead>Placement ID</TableHead>
                <TableHead className="text-right">GP Fee (GBP)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No staff deals found
                  </TableCell>
                </TableRow>
              ) : (
                staffDeals.map(deal => (
                  <TableRow key={deal.id}>
                    <TableCell className="font-medium">{deal.client}</TableCell>
                    <TableCell>{deal.worker_name || '-'}</TableCell>
                    <TableCell>{deal.placement_id || '-'}</TableCell>
                    <TableCell className="text-right">
                      £{Number(deal.value_converted_gbp || 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contracts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Placements</CardTitle>
          <CardDescription>Contract placements with manual value adjustments and mobilisation dates</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Worker Name</TableHead>
                <TableHead className="text-right">Submission Value (GBP)</TableHead>
                <TableHead className="text-right">Value This Year</TableHead>
                <TableHead className="text-right">Remaining Value</TableHead>
                <TableHead>Expected Mobilisation</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractDeals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isManager ? 7 : 6} className="text-center text-muted-foreground py-8">
                    No contract deals found
                  </TableCell>
                </TableRow>
              ) : (
                contractDeals.map(deal => {
                  const adjustment = getAdjustment(deal.id);
                  const submissionValue = Number(deal.value_converted_gbp || 0);
                  const valueThisYear = editedValues[deal.id]?.valueThisYear !== undefined 
                    ? Number(editedValues[deal.id].valueThisYear)
                    : Number(adjustment?.value_this_year_gbp || 0);
                  const remainingValue = submissionValue - valueThisYear;
                  const mobilisationDate = editedValues[deal.id]?.mobilisationDate || adjustment?.expected_mobilisation_date;

                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">{deal.client}</TableCell>
                      <TableCell>{deal.worker_name || '-'}</TableCell>
                      <TableCell className="text-right">£{submissionValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell className="text-right">
                        {isManager ? (
                          <Input
                            type="number"
                            className="w-32 text-right"
                            value={valueThisYear}
                            onChange={(e) => handleValueChange(deal.id, 'valueThisYear', e.target.value)}
                          />
                        ) : (
                          `£${valueThisYear.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">£{remainingValue.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                      <TableCell>
                        {isManager ? (
                          <Input
                            type="date"
                            className="w-40"
                            value={mobilisationDate || ''}
                            onChange={(e) => handleValueChange(deal.id, 'mobilisationDate', e.target.value)}
                          />
                        ) : (
                          mobilisationDate || '-'
                        )}
                      </TableCell>
                      {isManager && (
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleSave(deal.id, 'Contract')}
                            disabled={!editedValues[deal.id]}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Billings Section */}
      <Card>
        <CardHeader>
          <CardTitle>Actual Billings</CardTitle>
          <CardDescription>Actual billed GP from uploaded billing data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-4xl font-bold text-primary">
              £{totalBillingsGP.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-muted-foreground mt-2">Total GP billed to date</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
