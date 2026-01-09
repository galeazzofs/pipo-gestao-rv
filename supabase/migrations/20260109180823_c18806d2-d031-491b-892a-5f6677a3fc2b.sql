-- Add security documentation comments to critical functions
COMMENT ON FUNCTION public.has_role IS 
'CRITICAL SECURITY FUNCTION: Used by all RLS policies to check user roles. 
ANY CHANGES MUST BE SECURITY REVIEWED. This function uses SECURITY DEFINER 
to bypass RLS on user_roles table and prevent infinite recursion.';

COMMENT ON FUNCTION public.handle_updated_at IS 
'Trigger function for automatic timestamp updates. Uses SECURITY DEFINER 
to ensure it works regardless of user permissions.';

-- Restrict permissions on has_role function - only authenticated users should call it
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO service_role;

-- Restrict permissions on handle_updated_at function
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO service_role;