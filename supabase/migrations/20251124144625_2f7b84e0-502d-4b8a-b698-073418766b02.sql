-- Fix valid_duration constraint to only require duration for Contract deals, not Staff deals
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS valid_duration;

ALTER TABLE public.deals ADD CONSTRAINT valid_duration CHECK (
    (deal_type = 'Contract' AND duration_days IS NOT NULL AND duration_days <= 90) OR
    deal_type IN ('Staff', 'Service')
);