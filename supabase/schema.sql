create extension if not exists pgcrypto;

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  beerpong_enabled boolean not null default true,
  restaurant_max_capacity integer not null default 80,
  created_at timestamptz not null default now()
);

insert into public.settings (beerpong_enabled, restaurant_max_capacity)
select true, 80
where not exists (select 1 from public.settings);

create table if not exists public.umbrella_spots (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  row_number integer not null,
  spot_number integer not null,
  is_active boolean not null default true
);

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  seats integer not null default 4,
  is_active boolean not null default true
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_type text not null check (booking_type in ('ombrellone', 'ristorante', 'beerpong')),
  full_name text not null,
  phone text not null,
  email text,
  booking_date date not null,
  service_type text check (service_type is null or service_type in ('pranzo', 'cena')),
  time_slot text,
  guest_count integer check (guest_count is null or guest_count between 1 and 4),
  notes text,
  umbrella_code text references public.umbrella_spots(code) on update cascade on delete set null,
  table_code text references public.restaurant_tables(code) on update cascade on delete set null,
  team_name text,
  status text not null default 'Nuova' check (status in ('Nuova', 'In attesa', 'Confermata', 'Annullata')),
  payment_method text not null default 'pay_on_site' check (payment_method in ('pay_on_site', 'card_online', 'paypal_online')),
  payment_status text not null default 'Da pagare in loco' check (payment_status in ('Da pagare in loco', 'In attesa pagamento', 'Pagato', 'Fallito', 'Rimborsato')),
  payment_amount integer not null default 0,
  payment_reference text,
  paid_at timestamptz,
  provider_session_id text,
  privacy_accepted boolean not null default false,
  privacy_accepted_at timestamptz,
  constraint booking_payload_check check (
    (booking_type = 'ombrellone' and umbrella_code is not null and table_code is null and team_name is null)
    or (booking_type = 'ristorante' and table_code is not null and guest_count is not null and umbrella_code is null and team_name is null)
    or (booking_type = 'beerpong' and team_name is not null and umbrella_code is null and table_code is null)
  )
);

alter table public.reservations add column if not exists payment_method text;
alter table public.reservations add column if not exists payment_status text;
alter table public.reservations add column if not exists payment_amount integer;
alter table public.reservations add column if not exists payment_reference text;
alter table public.reservations add column if not exists paid_at timestamptz;
alter table public.reservations add column if not exists provider_session_id text;
alter table public.reservations add column if not exists privacy_accepted boolean default false;
alter table public.reservations add column if not exists privacy_accepted_at timestamptz;

update public.reservations
set payment_method = coalesce(payment_method, case when booking_type in ('ombrellone', 'beerpong') then 'pay_on_site' else 'pay_on_site' end),
    payment_status = coalesce(payment_status, case when booking_type in ('ombrellone', 'beerpong') then 'Da pagare in loco' else 'Da pagare in loco' end),
    payment_amount = coalesce(payment_amount, 0),
    privacy_accepted = coalesce(privacy_accepted, false)
where payment_method is null or payment_status is null or payment_amount is null or privacy_accepted is null;

alter table public.reservations alter column payment_method set default 'pay_on_site';
alter table public.reservations alter column payment_status set default 'Da pagare in loco';
alter table public.reservations alter column payment_amount set default 0;

insert into public.umbrella_spots (code, row_number, spot_number, is_active)
select format('F%s-O%02s', row_number, spot_number), row_number, spot_number, true
from generate_series(1,4) as row_number
cross join generate_series(1,10) as spot_number
where not exists (select 1 from public.umbrella_spots);

insert into public.restaurant_tables (code, seats, is_active)
select format('T%02s', table_number), 4, true
from generate_series(1,20) as table_number
where not exists (select 1 from public.restaurant_tables);

alter table public.settings enable row level security;
alter table public.umbrella_spots enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.reservations enable row level security;

drop policy if exists "public can read settings" on public.settings;
drop policy if exists "public can read umbrellas" on public.umbrella_spots;
drop policy if exists "public can read tables" on public.restaurant_tables;
drop policy if exists "public can insert reservations" on public.reservations;
drop policy if exists "public can read reservations" on public.reservations;
drop policy if exists "authenticated manage settings" on public.settings;
drop policy if exists "authenticated manage umbrellas" on public.umbrella_spots;
drop policy if exists "authenticated manage tables" on public.restaurant_tables;
drop policy if exists "authenticated manage reservations" on public.reservations;

create policy "public can read settings" on public.settings for select to anon, authenticated using (true);
create policy "public can read umbrellas" on public.umbrella_spots for select to anon, authenticated using (true);
create policy "public can read tables" on public.restaurant_tables for select to anon, authenticated using (true);
create policy "public can insert reservations" on public.reservations for insert to anon, authenticated with check (true);

create policy "authenticated manage settings" on public.settings for all to authenticated using (true) with check (true);
create policy "authenticated manage umbrellas" on public.umbrella_spots for all to authenticated using (true) with check (true);
create policy "authenticated manage tables" on public.restaurant_tables for all to authenticated using (true) with check (true);
create policy "authenticated manage reservations" on public.reservations for all to authenticated using (true) with check (true);

create unique index if not exists unique_active_umbrella_booking
on public.reservations (booking_date, umbrella_code)
where booking_type = 'ombrellone' and status in ('Nuova', 'In attesa', 'Confermata');

create unique index if not exists unique_active_table_booking
on public.reservations (booking_date, service_type, table_code)
where booking_type = 'ristorante' and status in ('Nuova', 'In attesa', 'Confermata');

create or replace function public.get_public_umbrella_occupancy(target_date date)
returns table (
  umbrella_code text,
  full_name text,
  phone text,
  status text
)
language sql
security definer
set search_path = public
as $$
  select umbrella_code, full_name, phone, status
  from public.reservations
  where booking_type = 'ombrellone'
    and booking_date = target_date
    and umbrella_code is not null
    and status in ('Nuova', 'In attesa', 'Confermata');
$$;

create or replace function public.get_public_table_occupancy(target_date date, target_service text)
returns table (
  table_code text,
  full_name text,
  phone text,
  guest_count integer,
  status text
)
language sql
security definer
set search_path = public
as $$
  select table_code, full_name, phone, guest_count, status
  from public.reservations
  where booking_type = 'ristorante'
    and booking_date = target_date
    and service_type = target_service
    and table_code is not null
    and status in ('Nuova', 'In attesa', 'Confermata');
$$;

grant execute on function public.get_public_umbrella_occupancy(date) to anon, authenticated;
grant execute on function public.get_public_table_occupancy(date, text) to anon, authenticated;


create table if not exists public.beerpong_tournaments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'in_progress' check (status in ('draft', 'in_progress', 'completed')),
  bracket_size integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beerpong_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.beerpong_tournaments(id) on delete cascade,
  round_number integer not null,
  match_number integer not null,
  team1_name text,
  team2_name text,
  team1_reservation_id uuid references public.reservations(id) on delete set null,
  team2_reservation_id uuid references public.reservations(id) on delete set null,
  winner_name text,
  winner_reservation_id uuid references public.reservations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'bye', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round_number, match_number)
);

alter table public.beerpong_tournaments enable row level security;
alter table public.beerpong_matches enable row level security;

drop policy if exists "public can read beerpong tournaments" on public.beerpong_tournaments;
drop policy if exists "public can read beerpong matches" on public.beerpong_matches;
drop policy if exists "authenticated manage beerpong tournaments" on public.beerpong_tournaments;
drop policy if exists "authenticated manage beerpong matches" on public.beerpong_matches;

create policy "public can read beerpong tournaments" on public.beerpong_tournaments for select to anon, authenticated using (true);
create policy "public can read beerpong matches" on public.beerpong_matches for select to anon, authenticated using (true);
create policy "authenticated manage beerpong tournaments" on public.beerpong_tournaments for all to authenticated using (true) with check (true);
create policy "authenticated manage beerpong matches" on public.beerpong_matches for all to authenticated using (true) with check (true);


alter table public.beerpong_tournaments
  add column if not exists updated_at timestamptz not null default now();

alter table public.beerpong_matches
  add column if not exists team1_name text,
  add column if not exists team2_name text,
  add column if not exists team1_reservation_id uuid references public.reservations(id) on delete set null,
  add column if not exists team2_reservation_id uuid references public.reservations(id) on delete set null,
  add column if not exists winner_name text,
  add column if not exists winner_reservation_id uuid references public.reservations(id) on delete set null,
  add column if not exists status text not null default 'pending',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_generic_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beerpong_tournaments_updated_at on public.beerpong_tournaments;
create trigger set_beerpong_tournaments_updated_at
before update on public.beerpong_tournaments
for each row execute function public.set_generic_updated_at();

drop trigger if exists set_beerpong_matches_updated_at on public.beerpong_matches;
create trigger set_beerpong_matches_updated_at
before update on public.beerpong_matches
for each row execute function public.set_generic_updated_at();
