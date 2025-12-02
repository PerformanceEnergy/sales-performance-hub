import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BillingRow {
  name?: string;
  revenue?: number;
  gp?: number;
  np?: number;
  currency?: string;
  [key: string]: any;
}

interface ProcessedBilling {
  user_id: string;
  revenue_gbp: number;
  gp_gbp: number;
  np_gbp: number;
}

async function convertToGBP(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency === 'GBP') return amount;
  
  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );
    const data = await response.json();
    const rate = data.rates.GBP;
    return amount * rate;
  } catch (error) {
    console.error(`Error converting ${fromCurrency} to GBP:`, error);
    throw error;
  }
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    const index = normalizedHeaders.indexOf(normalizedName);
    if (index !== -1) return index;
  }
  return -1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Authorization check - verify caller has admin privileges
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check caller's role
    const { data: callerProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role_type')
      .eq('id', caller.id)
      .single();

    if (profileError || !callerProfile) {
      return new Response(
        JSON.stringify({ error: 'Could not verify user role' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const allowedRoles = ['Admin', 'Manager', 'CEO'];
    if (!allowedRoles.includes(callerProfile.role_type)) {
      console.log(`Unauthorized billing upload attempt by user ${caller.id} with role ${callerProfile.role_type}`);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    const { upload_id, month, year } = await req.json();

    if (!upload_id || !month || !year) {
      throw new Error('Missing required parameters: upload_id, month, year');
    }

    console.log(`Processing upload ${upload_id} for ${month}/${year} by admin ${caller.id}`);

    // Fetch the upload data
    const { data: upload, error: uploadError } = await supabaseClient
      .from('billing_uploads')
      .select('file_data')
      .eq('id', upload_id)
      .single();

    if (uploadError) throw uploadError;

    const csvData = upload.file_data as BillingRow[];
    if (!Array.isArray(csvData) || csvData.length === 0) {
      throw new Error('Invalid or empty CSV data');
    }

    // Get all profiles to match names
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, name, email');

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles.length} profiles to match against`);

    // Find column indices
    const headers = Object.keys(csvData[0]);
    const nameIndex = findColumnIndex(headers, ['name', 'employee', 'person', 'worker', 'salesperson']);
    const revenueIndex = findColumnIndex(headers, ['revenue', 'rev']);
    const gpIndex = findColumnIndex(headers, ['gp', 'grosspro fit', 'gross']);
    const npIndex = findColumnIndex(headers, ['np', 'netprofit', 'net']);
    const currencyIndex = findColumnIndex(headers, ['currency', 'curr', 'ccy']);

    console.log('Column indices:', { nameIndex, revenueIndex, gpIndex, npIndex, currencyIndex });

    if (nameIndex === -1) {
      throw new Error('Could not find name column in CSV. Looking for: name, employee, person, worker, salesperson');
    }

    // Aggregate data by person
    const aggregated = new Map<string, { revenue: number; gp: number; np: number }>();

    for (const row of csvData) {
      const rowValues = Object.values(row);
      const nameValue = String(rowValues[nameIndex] || '').trim();
      
      if (!nameValue) continue;

      // Match name to profile (case-insensitive, partial match)
      const profile = profiles.find(p => 
        p.name.toLowerCase().includes(nameValue.toLowerCase()) ||
        nameValue.toLowerCase().includes(p.name.toLowerCase())
      );

      if (!profile) {
        console.log(`No profile match for: ${nameValue}`);
        continue;
      }

      const currency = currencyIndex !== -1 ? String(rowValues[currencyIndex] || 'GBP').trim().toUpperCase() : 'GBP';
      const revenue = revenueIndex !== -1 ? parseFloat(String(rowValues[revenueIndex] || 0)) : 0;
      const gp = gpIndex !== -1 ? parseFloat(String(rowValues[gpIndex] || 0)) : 0;
      const np = npIndex !== -1 ? parseFloat(String(rowValues[npIndex] || 0)) : 0;

      // Convert to GBP
      const revenueGbp = await convertToGBP(revenue, currency);
      const gpGbp = await convertToGBP(gp, currency);
      const npGbp = await convertToGBP(np, currency);

      // Aggregate
      const key = profile.id;
      if (!aggregated.has(key)) {
        aggregated.set(key, { revenue: 0, gp: 0, np: 0 });
      }
      const existing = aggregated.get(key)!;
      existing.revenue += revenueGbp;
      existing.gp += gpGbp;
      existing.np += npGbp;
    }

    console.log(`Aggregated data for ${aggregated.size} people`);

    // Delete existing records for this month/year from this upload (for corrections)
    const { error: deleteError } = await supabaseClient
      .from('billing_records')
      .delete()
      .eq('upload_id', upload_id);

    if (deleteError) console.error('Error deleting existing records:', deleteError);

    // Insert billing records
    const records = Array.from(aggregated.entries()).map(([user_id, data]) => ({
      user_id,
      month,
      year,
      revenue_gbp: data.revenue,
      gp_gbp: data.gp,
      np_gbp: data.np,
      upload_id,
    }));

    const { error: insertError } = await supabaseClient
      .from('billing_records')
      .insert(records);

    if (insertError) throw insertError;

    console.log(`Inserted ${records.length} billing records`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        records_processed: records.length,
        message: `Successfully processed ${records.length} billing records`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing billing upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
