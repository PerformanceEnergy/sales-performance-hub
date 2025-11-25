-- Add sales_role column to profiles table
-- This allows users to have different roles for sales display vs permissions
-- For example, Jordan can be CEO (permissions) but show as BD (sales)
ALTER TABLE public.profiles 
ADD COLUMN sales_role role_type;

COMMENT ON COLUMN public.profiles.sales_role IS 'Role displayed on sales boards and leaderboards. If NULL, uses role_type.';