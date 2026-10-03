-- No user ID argument: the authenticated caller can delete only their own account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare caller uuid := auth.uid();
begin
 if caller is null then
  raise exception 'Authentication required' using errcode = '28000';
 end if;
 delete from auth.users where id = caller;
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
