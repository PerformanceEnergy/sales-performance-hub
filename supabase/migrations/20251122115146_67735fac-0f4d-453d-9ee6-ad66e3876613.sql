-- Create enum types
CREATE TYPE public.role_type AS ENUM ('BD', 'DT', '360', 'Manager', 'CEO', 'Admin');
CREATE TYPE public.deal_type AS ENUM ('Staff', 'Contract', 'Service');
CREATE TYPE public.deal_status AS ENUM ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Revision Required', 'Voided');
CREATE TYPE public.currency_type AS ENUM ('GBP', 'USD', 'EUR', 'SAR', 'AED');

-- Create Teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT NOT NULL UNIQUE,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Users/Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_type role_type NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Deals table
CREATE TABLE public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_type deal_type NOT NULL,
    client TEXT NOT NULL,
    location TEXT NOT NULL,
    
    -- Staff/Contract specific fields
    placement_id TEXT,
    worker_name TEXT,
    gp_daily DECIMAL(12, 2),
    duration_days INTEGER,
    
    -- Service specific fields
    service_name TEXT,
    service_description TEXT,
    
    -- Financial fields
    currency currency_type NOT NULL DEFAULT 'GBP',
    value_original_currency DECIMAL(12, 2) NOT NULL,
    value_converted_gbp DECIMAL(12, 2),
    
    -- Dates
    submitted_month INTEGER CHECK (submitted_month >= 1 AND submitted_month <= 12),
    submitted_year INTEGER,
    
    -- Status and workflow
    status deal_status DEFAULT 'Draft',
    submitted_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    approved_by_user_id UUID REFERENCES auth.users(id),
    
    -- Renewal tracking
    is_renewal BOOLEAN DEFAULT false,
    renewal_count INTEGER DEFAULT 0,
    
    -- Additional fields
    reason_for_backdate TEXT,
    void_reason TEXT,
    voided_by_user_id UUID REFERENCES auth.users(id),
    revision_comment TEXT,
    
    -- Split fields (max 3 people)
    bd_user_id UUID REFERENCES auth.users(id),
    dt_user_id UUID REFERENCES auth.users(id),
    user_360_id UUID REFERENCES auth.users(id),
    bd_percent DECIMAL(5, 2),
    dt_percent DECIMAL(5, 2),
    percent_360 DECIMAL(5, 2),
    
    -- Constraints
    CONSTRAINT valid_staff_contract CHECK (
        (deal_type IN ('Staff', 'Contract') AND placement_id IS NOT NULL AND worker_name IS NOT NULL AND gp_daily IS NOT NULL) OR
        deal_type = 'Service'
    ),
    CONSTRAINT valid_service CHECK (
        (deal_type = 'Service' AND service_name IS NOT NULL) OR
        deal_type IN ('Staff', 'Contract')
    ),
    CONSTRAINT valid_duration CHECK (
        (deal_type IN ('Staff', 'Contract') AND duration_days IS NOT NULL AND duration_days <= 90) OR
        deal_type = 'Service'
    ),
    CONSTRAINT valid_split_total CHECK (
        (bd_percent + COALESCE(dt_percent, 0) + COALESCE(percent_360, 0)) = 100
    ),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Teams
CREATE POLICY "Teams viewable by authenticated users"
    ON public.teams FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Teams manageable by admins only"
    ON public.teams FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_type IN ('Admin', 'Manager', 'CEO')
        )
    );

-- RLS Policies for Profiles
CREATE POLICY "Profiles viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Profiles manageable by admins only"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_type IN ('Admin', 'Manager', 'CEO')
        )
    );

CREATE POLICY "Profiles updatable by admins only"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_type IN ('Admin', 'Manager', 'CEO')
        )
    );

-- RLS Policies for Deals
CREATE POLICY "Deals viewable by authenticated users"
    ON public.deals FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Deals insertable by authenticated users"
    ON public.deals FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = submitted_by_user_id);

CREATE POLICY "Deals updatable by owner when draft or revision required"
    ON public.deals FOR UPDATE
    TO authenticated
    USING (
        (auth.uid() = submitted_by_user_id AND status IN ('Draft', 'Revision Required'))
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role_type IN ('Admin', 'Manager', 'CEO')
        )
    );

-- Create function to auto-populate profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, role_type)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
        NEW.email,
        'BD'::role_type
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at
    BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();