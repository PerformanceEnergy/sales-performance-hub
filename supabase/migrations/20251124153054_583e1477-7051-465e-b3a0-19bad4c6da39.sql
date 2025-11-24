-- Create table for billing CSV uploads
CREATE TABLE public.billing_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  uploaded_by_user_id UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_name TEXT NOT NULL,
  file_data JSONB NOT NULL,
  is_correction BOOLEAN NOT NULL DEFAULT false,
  correction_reason TEXT,
  replaced_upload_id UUID REFERENCES public.billing_uploads(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year, is_correction)
);

-- Enable RLS
ALTER TABLE public.billing_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Viewable by authenticated users
CREATE POLICY "Billing uploads viewable by authenticated users"
ON public.billing_uploads
FOR SELECT
TO authenticated
USING (true);

-- Policy: Insertable by Manager/CEO/Admin only
CREATE POLICY "Billing uploads insertable by managers only"
ON public.billing_uploads
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role_type IN ('Admin', 'Manager', 'CEO')
  )
);

-- Create table for billing targets
CREATE TABLE public.billing_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL UNIQUE,
  target_gp NUMERIC NOT NULL,
  set_by_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.billing_targets ENABLE ROW LEVEL SECURITY;

-- Policy: Viewable by authenticated users
CREATE POLICY "Billing targets viewable by authenticated users"
ON public.billing_targets
FOR SELECT
TO authenticated
USING (true);

-- Policy: Manageable by CEO only (Jordan Beales)
CREATE POLICY "Billing targets manageable by CEO only"
ON public.billing_targets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role_type = 'CEO'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role_type = 'CEO'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_billing_targets_updated_at
BEFORE UPDATE ON public.billing_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();