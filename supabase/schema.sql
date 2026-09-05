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

-- 3. Exercices et devoirs (avec corrigés)
create table if not exists exercices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titre text not null,
  matiere text not null,
  cycle text not null,
  classe text not null,
  annee_scolaire text,
  consignes text,
  contenu jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table exercices enable row level security;

create policy "Un enseignant gère ses propres exercices"
  on exercices
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_exercices_user on exercices(user_id);

-- 4. Fiches d'évaluation / interrogations / examens avec barème
create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  titre text not null,
  matiere text not null,
  cycle text not null,
  classe text not null,
  annee_scolaire text,
  type_evaluation text not null default 'interrogation' check (type_evaluation in ('interrogation', 'devoir', 'examen')),
  duree_minutes integer,
  bareme_total numeric(5,2) not null default 20,
  consignes text,
  contenu jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table evaluations enable row level security;

create policy "Un enseignant gère ses propres évaluations"
  on evaluations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_evaluations_user on evaluations(user_id);

-- 5. Cahier de textes numérique (suivi de ce qui a été enseigné, date par date)
create table if not exists cahier_texte (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_cours date not null default current_date,
  matiere text not null,
  cycle text,
  classe text,
  contenu text not null,
  fiche_id uuid references fiches_cours(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table cahier_texte enable row level security;

create policy "Un enseignant gère son propre cahier de textes"
  on cahier_texte
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_cahier_texte_user_date on cahier_texte(user_id, date_cours desc);

-- 6. Emploi du temps personnel de l'enseignant
create table if not exists emploi_du_temps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  jour_semaine text not null check (jour_semaine in ('lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi')),
  heure_debut time not null,
  heure_fin time not null,
  matiere text not null,
  classe text,
  cycle text,
  salle text,
  created_at timestamptz not null default now()
);

alter table emploi_du_temps enable row level security;

create policy "Un enseignant gère son propre emploi du temps"
  on emploi_du_temps
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_emploi_du_temps_user on emploi_du_temps(user_id, jour_semaine);
