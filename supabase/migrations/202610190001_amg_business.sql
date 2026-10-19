-- AMG Traders: private, verified-email admin access. No public signup or write policies.
create table public.amg_business (
 owner uuid primary key references auth.users(id),
 version integer not null check(version > 0),
 data jsonb not null check(jsonb_typeof(data) = 'object'),
 updated_at timestamptz not null default now()
);
create table public.amg_command_audit (
 owner uuid not null references auth.users(id),
 command_id uuid not null,
 version integer not null,
 command jsonb not null,
 received_at timestamptz not null default now(),
 primary key(owner, command_id)
);
alter table public.amg_business enable row level security;
alter table public.amg_command_audit enable row level security;
revoke all on public.amg_business, public.amg_command_audit from anon, authenticated;
grant select on public.amg_business, public.amg_command_audit to authenticated;
grant all on public.amg_business, public.amg_command_audit to service_role;
create function public.amg_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from auth.users u where u.id = auth.uid()
 and lower(u.email) = 'amarojumahesh361@gmail.com' and u.email_confirmed_at is not null);
$$;
revoke all on function public.amg_is_admin() from public, anon;
grant execute on function public.amg_is_admin() to authenticated, service_role;
create policy amg_admin_reads_business on public.amg_business for select to authenticated
 using (owner = auth.uid() and public.amg_is_admin());
create policy amg_admin_reads_audit on public.amg_command_audit for select to authenticated
 using (owner = auth.uid() and public.amg_is_admin());
-- Only the server may commit validated commands. Row update and audit insert share one transaction.
create function public.amg_save_state(p_owner uuid, p_expected_version integer, p_state jsonb, p_command jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare changed integer;
begin
 if not exists(select 1 from auth.users u where u.id=p_owner
   and lower(u.email)='amarojumahesh361@gmail.com' and u.email_confirmed_at is not null) then
   raise exception 'Admin access required';
 end if;
 if p_expected_version < 0 or (p_state->>'schema') is distinct from '1' or jsonb_typeof(p_state) <> 'object' then
   raise exception 'Invalid business state';
 end if;
 if p_expected_version = 0 then
   insert into public.amg_business(owner,version,data) values(p_owner,1,p_state) on conflict do nothing;
 else
   update public.amg_business set version=p_expected_version+1,data=p_state,updated_at=now()
   where owner=p_owner and version=p_expected_version;
 end if;
 get diagnostics changed = row_count;
 if changed = 0 then return false; end if;
 insert into public.amg_command_audit(owner,command_id,version,command)
 values(p_owner,(p_command->>'id')::uuid,p_expected_version+1,p_command);
 return true;
end;
$$;
revoke all on function public.amg_save_state(uuid,integer,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.amg_save_state(uuid,integer,jsonb,jsonb) to service_role;

