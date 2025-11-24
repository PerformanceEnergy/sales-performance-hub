import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AnalyticsProjectionDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { projection, currentTotal, avgMonthly, remainingMonths, monthlyTrends } = location.state || {
    projection: 0,
    currentTotal: 0,
    avgMonthly: 0,
    remainingMonths: 0,
    monthlyTrends: [],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/analytics')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Year Projection Details</h1>
          <p className="text-muted-foreground">Breakdown of year-end projection calculation</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current YTD Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              £{currentTotal.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Average Monthly GP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              £{avgMonthly.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Remaining Months</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{remainingMonths}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projection Calculation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Current YTD GP Added</span>
            <span className="text-lg">£{currentTotal.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="font-medium">Projected Remaining ({remainingMonths} months × £{avgMonthly.toLocaleString('en-GB', { maximumFractionDigits: 0 })})</span>
            <span className="text-lg">£{(avgMonthly * remainingMonths).toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-t-2 border-primary">
            <span className="font-bold text-lg">Year-End Projection</span>
            <span className="text-2xl font-bold text-accent">£{projection.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">GP Added</TableHead>
                <TableHead className="text-right">Deals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyTrends.map((month: any, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{month.month}</TableCell>
                  <TableCell className="text-right">£{month.gpAdded.toLocaleString('en-GB', { maximumFractionDigits: 0 })}</TableCell>
                  <TableCell className="text-right">{month.deals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
