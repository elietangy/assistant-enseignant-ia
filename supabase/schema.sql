-- Schéma Supabase pour Assistant Enseignant IA
-- À exécuter dans l'éditeur SQL du projet Supabase (SQL Editor > New query)

-- 1. Profils enseignants (complète auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nom_complet text,
  ecole text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Un enseignant gère son propre profil"
  on profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Création automatique d'une ligne de profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nom_complet)
  values (new.id, coalesce(new.raw_user_meta_data->>'nom_complet', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Fiches de préparation de cours
create table if not exists fiches_cours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titre text not null,
  matiere text not null,
  cycle text not null,
  classe text not null,
  annee_scolaire text,
  objectifs jsonb not null default '[]'::jsonb,
  deroulement jsonb not null default '[]'::jsonb,
  materiel text,
  evaluation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table fiches_cours enable row level security;

create policy "Un enseignant gère ses propres fiches"
  on fiches_cours
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_fiches_cours_user on fiches_cours(user_id);
create index if not exists idx_fiches_cours_matiere on fiches_cours(matiere);
create index if not exists idx_fiches_cours_cycle on fiches_cours(cycle);
