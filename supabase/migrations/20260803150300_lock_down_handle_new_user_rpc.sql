-- handle_new_user is only meant to run as the on_auth_user_created trigger.
-- Being SECURITY DEFINER in the public schema made it callable directly via
-- PostgREST (/rest/v1/rpc/handle_new_user) by anon/authenticated roles.
-- Revoking EXECUTE closes that off; the trigger itself still works since
-- trigger invocation doesn't require an EXECUTE grant.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
