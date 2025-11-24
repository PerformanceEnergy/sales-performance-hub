-- Create table to store projection adjustments for deals
CREATE TABLE IF NOT EXISTS public.projection_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  value_this_year_gbp NUMERIC,
  expected_mobilisation_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(deal_id, year)
);

-- Enable RLS
ALTER TABLE public.projection_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view projection adjustments
CREATE POLICY "Projection adjustments viewable by authenticated users"
  ON public.projection_adjustments
  FOR SELECT
  USING (true);

-- Allow managers/CEO to insert projection adjustments
CREATE POLICY "Projection adjustments insertable by managers"
  ON public.projection_adjustments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_type IN ('Admin', 'Manager', 'CEO')
    )
  );

-- Allow managers/CEO to update projection adjustments
CREATE POLICY "Projection adjustments updatable by managers"
  ON public.projection_adjustments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role_type IN ('Admin', 'Manager', 'CEO')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_projection_adjustments_updated_at
  BEFORE UPDATE ON public.projection_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();