-- Sunday School Attendance - initial schema.
--
-- This file was squashed from an earlier, longer migration history (an
-- original 12-table design, then a row-per-date attendance model, both
-- fully superseded) into a single migration that builds directly to the
-- schema actually running in production. Applying this file (plus
-- 0002_rls_policies.sql) to a fresh Supabase project reproduces today's
-- database exactly - there is no dependency on anything that came before.
--
-- Org model: Superintendent / Teacher / Volunteer all live as rows in
-- `teachers`, distinguished by `role`. Students never log in - they're
-- just records. A section is a denormalized "Level-Section" string (e.g.
-- "Beginner-A") on both `teachers` and `students`; splitting that back
-- into level/section is a backend/frontend concern, not the database's.

create type person_type as enum ('teacher', 'student');
create type teacher_role as enum ('teacher', 'volunteer', 'superintendent');

-- Shared identity table. A single `attendance.person_id` column can't have
-- a foreign key to two different tables at once, so both `teachers` and
-- `students` register their id here, and `attendance` references this
-- table instead - keeping real referential integrity with one column.
-- Populated only via the triggers below, never written to directly.
create table people (
  id text primary key,
  person_type person_type not null
);

-- ID generation: two sequences + a trigger per table. The app never sets
-- or constructs an id - it's stamped on automatically as T000001,
-- T000002, ... / S000001, S000002, ...
create sequence teacher_id_seq;
create sequence student_id_seq;

create function assign_teacher_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id is null then
    new.id := 'T' || lpad(nextval('teacher_id_seq')::text, 6, '0');
  end if;
  insert into people (id, person_type) values (new.id, 'teacher');
  return new;
end;
$$;

create function assign_student_id() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.id is null then
    new.id := 'S' || lpad(nextval('student_id_seq')::text, 6, '0');
  end if;
  insert into people (id, person_type) values (new.id, 'student');
  return new;
end;
$$;

create function cleanup_person_on_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from people where id = old.id;
  return old;
end;
$$;

-- auth_user_id links a logged-in Supabase Auth session to a specific
-- teacher/volunteer/superintendent row - every RLS policy in
-- 0002_rls_policies.sql depends on this. Nullable: a row can exist before
-- that person's auth login is created.
create table teachers (
  id text primary key references people(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  class_section text not null, -- empty string for volunteers/superintendent, who aren't tied to a section
  role teacher_role not null default 'teacher'
);

create trigger trg_assign_teacher_id
  before insert on teachers
  for each row execute function assign_teacher_id();

create trigger trg_cleanup_teacher_person
  after delete on teachers
  for each row execute function cleanup_person_on_delete();

create table students (
  id text primary key references people(id) on delete cascade,
  full_name text not null,
  dob date,
  contact_no text,
  class_section text not null,
  -- Plain comma-separated text, e.g. "T000001,T000002" - NOT a real FK.
  -- Deliberate simplicity-over-integrity tradeoff: the database can't
  -- validate the ids inside it, and lookups are text-search, not joins.
  teacher_ids text
);

create trigger trg_assign_student_id
  before insert on students
  for each row execute function assign_student_id();

create trigger trg_cleanup_student_person
  after delete on students
  for each row execute function cleanup_person_on_delete();

-- Validates that every value inside `data` is exactly "P", "A", or "OD".
-- Has to live in its own function rather than inline in the CHECK clause
-- below, since a plain CHECK constraint can't contain a subquery directly
-- - only a function call, with the subquery inside the function body.
create function jsonb_values_are_valid_marks(dates jsonb) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select not exists (
    select 1 from jsonb_each_text(dates) as d(date_key, status_value)
    where status_value not in ('P', 'A', 'OD')
  );
$$;

-- One row per person per academic year - NOT per attendance date. `data`
-- holds a JSON object like {"2026-06-07": "P", "2026-06-14": "OD"},
-- bounded to one year's worth of dates (~40 Sundays) per row, so updates
-- stay cheap and don't grow indefinitely. This was a deliberate choice
-- over a normalized row-per-date table.
create table attendance (
  id uuid primary key default gen_random_uuid(),
  person_id text not null references people(id) on delete cascade,
  academic_year text not null,
  data jsonb not null default '{}'::jsonb,
  unique (person_id, academic_year),
  constraint data_values_are_valid_marks check (jsonb_values_are_valid_marks(data))
);
