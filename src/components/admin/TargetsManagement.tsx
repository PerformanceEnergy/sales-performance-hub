import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Target, Save } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface IndividualTarget {
  id?: string;
  user_id: string;
  year: number;
  month: number;
  target_gp: number;
}

export default function TargetsManagement() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profiles, setProfiles] = useState<Tables<'profiles'>[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [targets, setTargets] = useState<Record<number, number>>({});
  const [existingTargets, setExistingTargets] = useState<IndividualTarget[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchTargets();
    }
  }, [selectedUser, selectedYear]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, teams(team_name)')
      .eq('active', true)
      .order('name');

    if (data) setProfiles(data);
  };

  const fetchTargets = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('individual_targets')
      .select('*')
      .eq('user_id', selectedUser)
      .eq('year', selectedYear);

    if (data) {
      setExistingTargets(data);
      const targetMap: Record<number, number> = {};
      data.forEach(t => {
        targetMap[t.month] = Number(t.target_gp);
      });
      setTargets(targetMap);
    } else {
      setTargets({});
      setExistingTargets([]);
    }
    setIsLoading(false);
  };

  const handleTargetChange = (month: number, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setTargets(prev => ({ ...prev, [month]: numValue }));
  };

  const handleSaveTargets = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      // Upsert all 12 months
      const upsertData = MONTHS.map((_, index) => ({
        user_id: selectedUser,
        year: selectedYear,
        month: index + 1,
        target_gp: targets[index + 1] || 0
      }));

      const { error } = await supabase
        .from('individual_targets')
        .upsert(upsertData, { 
          onConflict: 'user_id,year,month',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast({
        title: 'Targets saved',
        description: `Targets for ${selectedYear} have been saved successfully`
      });

      fetchTargets();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getYearlyTotal = () => {
    return Object.values(targets).reduce((sum, val) => sum + (val || 0), 0);
  };

  const getQuarterlyTotal = (quarter: number) => {
    const startMonth = (quarter - 1) * 3 + 1;
    return [startMonth, startMonth + 1, startMonth + 2].reduce(
      (sum, m) => sum + (targets[m] || 0), 0
    );
  };

  const getHalfYearlyTotal = (half: number) => {
    const startMonth = half === 1 ? 1 : 7;
    const endMonth = half === 1 ? 6 : 12;
    let sum = 0;
    for (let m = startMonth; m <= endMonth; m++) {
      sum += targets[m] || 0;
    }
    return sum;
  };

  const selectedProfile = profiles.find(p => p.id === selectedUser);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Individual Targets
          </CardTitle>
          <CardDescription>
            Set monthly GP targets for each team member
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name} ({profile.role_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedUser && (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Month</TableHead>
                          <TableHead className="text-right">Target GP (£)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MONTHS.map((month, index) => (
                          <TableRow key={month}>
                            <TableCell className="font-medium">{month}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="w-32 ml-auto text-right"
                                value={targets[index + 1] || ''}
                                onChange={(e) => handleTargetChange(index + 1, e.target.value)}
                                placeholder="0"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary */}
                  <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Q1 Total</div>
                        <div className="text-xl font-bold">
                          £{getQuarterlyTotal(1).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Q2 Total</div>
                        <div className="text-xl font-bold">
                          £{getQuarterlyTotal(2).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Q3 Total</div>
                        <div className="text-xl font-bold">
                          £{getQuarterlyTotal(3).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Q4 Total</div>
                        <div className="text-xl font-bold">
                          £{getQuarterlyTotal(4).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3 pt-2">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">H1 Total</div>
                        <div className="text-xl font-bold">
                          £{getHalfYearlyTotal(1).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">H2 Total</div>
                        <div className="text-xl font-bold">
                          £{getHalfYearlyTotal(2).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5">
                      <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Yearly Total</div>
                        <div className="text-2xl font-bold text-primary">
                          £{getYearlyTotal().toLocaleString('en-GB', { maximumFractionDigits: 0 })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Button onClick={handleSaveTargets} disabled={isSaving} className="w-full">
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Targets
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
