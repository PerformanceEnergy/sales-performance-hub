-- Add fields to store estimated opportunity values for Contract deals
ALTER TABLE public.deals 
ADD COLUMN estimated_days_12_months integer,
ADD COLUMN total_estimated_opportunity_gbp numeric;

COMMENT ON COLUMN public.deals.estimated_days_12_months IS 'For Contract deals: Total estimated days over the next 12 months';
COMMENT ON COLUMN public.deals.total_estimated_opportunity_gbp IS 'For Contract deals: Daily GP × estimated 12-month days × FX rate (in GBP)';