-- Create billing_records table to store processed billing data
CREATE TABLE public.billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  revenue_gbp NUMERIC NOT NULL DEFAULT 0,
  gp_gbp NUMERIC NOT NULL DEFAULT 0,
  np_gbp NUMERIC NOT NULL DEFAULT 0,
  upload_id UUID REFERENCES public.billing_uploads(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, month, year, upload_id)
);

-- Enable RLS
ALTER TABLE public.billing_records ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view billing records
CREATE POLICY "Billing records viewable by authenticated users"
  ON public.billing_records
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow managers/admins to insert billing records
CREATE POLICY "Billing records insertable by managers"
  ON public.billing_records
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_type IN ('Admin', 'Manager', 'CEO')
    )
  );

-- Allow managers/admins to update billing records
CREATE POLICY "Billing records updatable by managers"
  ON public.billing_records
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_type IN ('Admin', 'Manager', 'CEO')
    )
  );

-- Allow managers/admins to delete billing records
CREATE POLICY "Billing records deletable by managers"
  ON public.billing_records
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_type IN ('Admin', 'Manager', 'CEO')
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_billing_records_updated_at
  BEFORE UPDATE ON public.billing_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();