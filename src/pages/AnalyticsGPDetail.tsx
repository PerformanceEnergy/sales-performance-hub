import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';

export default function AnalyticsGPDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { deals, profiles } = location.state || { deals: [], profiles: [] };

  const dealDetails = deals
    .filter((d: any) => !d.is_renewal)
    .map((deal: any) => {
      const bdProfile = profiles.find((p: any) => p.id === deal.bd_user_id);
      const dtProfile = profiles.find((p: any) => p.id === deal.dt_user_id);
      const profile360 = profiles.find((p: any) => p.id === deal.user_360_id);
      
      return {
        id: deal.id,
        client: deal.client,
        dealType: deal.deal_type,
        value: Number(deal.value_converted_gbp) || 0,
        date: new Date(deal.created_at).toLocaleDateString('en-GB'),
        bdRep: bdProfile?.name,
        dtRep: dtProfile?.name,
        rep360: profile360?.name,
      };
    })
    .sort((a: any, b: any) => b.value - a.value);

  const totalGP = dealDetails.reduce((sum: number, d: any) => sum + d.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Total GP Added Details</h1>
          <p className="text-muted-foreground">Breakdown of all GP Added deals</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Total: £{totalGP.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value (GBP)</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>BD Rep</TableHead>
                <TableHead>DT Rep</TableHead>
                <TableHead>360 Rep</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealDetails.map((deal: any) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.client}</TableCell>
                  <TableCell>{deal.dealType}</TableCell>
                  <TableCell>£{deal.value.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell>{deal.date}</TableCell>
                  <TableCell>{deal.bdRep || '-'}</TableCell>
                  <TableCell>{deal.dtRep || '-'}</TableCell>
                  <TableCell>{deal.rep360 || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
