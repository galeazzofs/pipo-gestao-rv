-- Create enum for CN levels
create type public.cn_level as enum ('CN1', 'CN2', 'CN3');

-- Create enum for app roles
create type public.app_role as enum ('admin', 'cn');

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  nivel cn_level not null default 'CN1',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create user_roles table (separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamp with time zone default now(),
  unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Security definer function to check roles (avoids infinite recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS Policy: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- RLS Policy: Admins can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can insert profiles
create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can update profiles
create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Admins can delete profiles
create policy "Admins can delete profiles"
  on public.profiles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- RLS Policy: Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles for select
  to authenticated
  using (auth.uid() = user_id);

-- RLS Policy: Admins can manage all roles
create policy "Admins can view all roles"
  on public.user_roles for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can insert roles"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for profiles updated_at
create trigger on_profiles_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();