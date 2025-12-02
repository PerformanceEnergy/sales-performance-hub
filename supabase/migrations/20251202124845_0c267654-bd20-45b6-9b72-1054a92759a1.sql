-- Create individual_targets table for monthly targets per user
CREATE TABLE public.individual_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  target_gp NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, month)
);

-- Enable RLS
ALTER TABLE public.individual_targets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Individual targets viewable by authenticated users"
ON public.individual_targets
FOR SELECT
USING (true);

CREATE POLICY "Individual targets manageable by admins"
ON public.individual_targets
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role_type = ANY (ARRAY['Admin'::role_type, 'Manager'::role_type, 'CEO'::role_type])
));

-- Trigger for updated_at
CREATE TRIGGER update_individual_targets_updated_at
BEFORE UPDATE ON public.individual_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();