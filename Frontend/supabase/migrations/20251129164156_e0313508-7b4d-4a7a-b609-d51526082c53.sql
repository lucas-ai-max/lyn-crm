-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'superadmin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Superadmins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN role = 'superadmin' THEN 'superadmin'::app_role
    WHEN role = 'admin' THEN 'admin'::app_role
    ELSE 'user'::app_role
  END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Add default 'user' role for profiles without role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'user'::app_role
FROM public.profiles
WHERE role IS NULL OR role NOT IN ('user', 'admin', 'superadmin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Update company table RLS to use has_role
DROP POLICY IF EXISTS "Users can access only their own company" ON public.company;
CREATE POLICY "Users can access their company"
  ON public.company
  FOR SELECT
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  );

-- Superadmins can see all companies
CREATE POLICY "Superadmins can view all companies"
  ON public.company
  FOR SELECT
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Admins and superadmins can update their own company
CREATE POLICY "Admins can update own company"
  ON public.company
  FOR UPDATE
  USING (
    id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'superadmin'))
  );

-- Superadmins can insert companies
CREATE POLICY "Superadmins can insert companies"
  ON public.company
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'superadmin'));