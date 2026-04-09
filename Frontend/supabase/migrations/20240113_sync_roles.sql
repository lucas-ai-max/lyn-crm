-- Migration: Sync profiles.role to user_roles
-- Description: Ensures that user_roles table is automatically updated whenever profiles.role changes.

-- 1. Create the function to handle the synchronization
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_user_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if role is not null
  IF NEW.role IS NOT NULL THEN
    -- Check if a user_role entry exists
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
      -- Update existing entry
      UPDATE public.user_roles
      SET role = NEW.role::public.app_role
      WHERE user_id = NEW.id;
    ELSE
      -- Insert new entry
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, NEW.role::public.app_role);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Create the trigger on the profiles table
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;

CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.sync_profile_role_to_user_roles();

-- 3. (Optional) Backfill: Update existing user_roles based on current profiles
-- Uncomment the following line if you want to force sync immediately
-- UPDATE public.user_roles ur SET role = p.role::public.app_role FROM public.profiles p WHERE ur.user_id = p.id AND p.role IS NOT NULL;
