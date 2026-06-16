-- supabase/schema.sql

-- Extensions
create extension if not exists "uuid-ossp";

-- Installers (admin users — solar company)
create table installers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  soliscloud_api_id text,
  soliscloud_api_secret text,
  soliscloud_api_url text default 'https://www.soliscloud.com:13333',
  created_at timestamptz default now()
);

-- Clients (end users — each has login)
create table users (
  id uuid primary key default uuid_generate_v4(),
  installer_id uuid references installers(id) on delete cascade,
  name text not null,
  email text not null unique,
  password_hash text not null,
  phone text,
  created_at timestamptz default now()
);

-- Plants (solar installations in SolisCloud)
create table plants (
  id uuid primary key default uuid_generate_v4(),
  installer_id uuid references installers(id) on delete cascade,
  soliscloud_plant_id text not null,
  name text not null,
  capacity_kwp numeric(8,2),
  city text,
  state text,
  created_at timestamptz default now(),
  unique(installer_id, soliscloud_plant_id)
);

-- Contracts (client's share in a plant)
create table contracts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  plant_id uuid references plants(id) on delete cascade,
  name text not null,
  percentage numeric(5,2) not null check (percentage > 0 and percentage <= 100),
  investment_brl numeric(12,2) not null,
  tariff_kwh numeric(6,4) not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- Percentage/tariff change history
create table percentage_history (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid references contracts(id) on delete cascade,
  percentage numeric(5,2) not null,
  tariff_kwh numeric(6,4) not null,
  changed_at timestamptz default now(),
  reason text
);

-- Production data cache from SolisCloud
create table production_cache (
  id uuid primary key default uuid_generate_v4(),
  plant_id uuid references plants(id) on delete cascade,
  date date not null,
  energy_kwh numeric(10,3),
  peak_power_kw numeric(8,3),
  cached_at timestamptz default now(),
  unique(plant_id, date)
);

-- Indexes
create index on contracts(user_id);
create index on contracts(plant_id);
create index on production_cache(plant_id, date);
create index on percentage_history(contract_id, changed_at);
