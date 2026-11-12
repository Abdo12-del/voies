-- Each student ID is also their immutable Supabase Auth user ID.
-- Teacher accounts are provisioned out of band; neither signup metadata nor browser code grants a role.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('teacher', 'student')),
  name text not null check (char_length(name) between 1 and 60)
);
create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  teacher_id uuid not null references public.profiles(id) on delete restrict,
  -- A code is a bearer credential: store its SHA-256, NEVER its plaintext.
  login_code text not null unique check (login_code ~ '^[a-f0-9]{64}$'),
  constraint student_not_own_teacher check (id <> teacher_id)
);
create index students_teacher_id_idx on public.students(teacher_id);
create table public.progress (
  student_id uuid primary key references public.students(id) on delete cascade,
  completed_count integer not null default 0 check (completed_count between 0 and 32),
  updated_at timestamptz not null default now(),
  approved_by uuid references public.profiles(id) on delete set null
);

create function private.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'teacher');
$$;
revoke all on function private.is_teacher() from public, anon;
grant execute on function private.is_teacher() to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.progress enable row level security;
create policy profiles_read_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy students_read_owned on public.students for select to authenticated using (
  id = (select auth.uid()) or (teacher_id = (select auth.uid()) and (select private.is_teacher()))
);
create policy progress_read_owned on public.progress for select to authenticated using (
  exists (select 1 from public.students s where s.id = progress.student_id and (
    s.id = (select auth.uid()) or (s.teacher_id = (select auth.uid()) and (select private.is_teacher()))
  ))
);
-- Deliberately NO INSERT/UPDATE/DELETE policies or grants for authenticated users.
-- Even a teacher must go through the one-step RPCs, never PATCH completed_count = 32.
revoke all on public.profiles, public.students, public.progress from public, anon, authenticated;
grant select on public.profiles, public.progress to authenticated;
grant select (id, name, teacher_id) on public.students to authenticated;
grant all on public.profiles, public.students, public.progress to service_role;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, name)
  values (new.id, 'student', left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), 'حساب جديد'), 60));
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_journey_user_created after insert on auth.users for each row execute function private.handle_new_user();

create function public.approve_next_session(student_id uuid) returns public.progress
language plpgsql security definer set search_path = '' as $$
declare result public.progress;
begin
  if (select auth.uid()) is null or not private.is_teacher() then
    raise exception 'Teacher access required' using errcode = '42501';
  end if;
  select p.* into result from public.progress p join public.students s on s.id = p.student_id
    where p.student_id = $1 and s.teacher_id = (select auth.uid()) for update of p;
  if not found then raise exception 'Student not owned by this teacher' using errcode = '42501'; end if;
  if result.completed_count >= 32 then raise exception 'Journey already complete' using errcode = '22023'; end if;
  update public.progress p set completed_count = result.completed_count + 1,
    updated_at = now(), approved_by = (select auth.uid())
    where p.student_id = $1 returning p.* into result;
  return result;
end;
$$;
create function public.undo_last_session(student_id uuid) returns public.progress
language plpgsql security definer set search_path = '' as $$
declare result public.progress;
begin
  if (select auth.uid()) is null or not private.is_teacher() then
    raise exception 'Teacher access required' using errcode = '42501';
  end if;
  select p.* into result from public.progress p join public.students s on s.id = p.student_id
    where p.student_id = $1 and s.teacher_id = (select auth.uid()) for update of p;
  if not found then raise exception 'Student not owned by this teacher' using errcode = '42501'; end if;
  if result.completed_count <= 0 then raise exception 'No approval to undo' using errcode = '22023'; end if;
  update public.progress p set completed_count = result.completed_count - 1,
    updated_at = now(), approved_by = (select auth.uid())
    where p.student_id = $1 returning p.* into result;
  return result;
end;
$$;
revoke all on function public.approve_next_session(uuid), public.undo_last_session(uuid) from public, anon;
grant execute on function public.approve_next_session(uuid), public.undo_last_session(uuid) to authenticated;

-- Atomic companion to auth.admin.createUser. Only the server-side Edge Function can invoke it.
create function public.register_student(student_id uuid, student_name text, owner_id uuid, code_hash text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles p where p.id = $3 and p.role = 'teacher') then
    raise exception 'Invalid teacher' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = $1 and p.role = 'student') then
    raise exception 'Invalid student' using errcode = '42501';
  end if;
  insert into public.students (id, name, teacher_id, login_code) values ($1, trim($2), $3, $4);
  insert into public.progress (student_id, completed_count) values ($1, 0);
end;
$$;
revoke all on function public.register_student(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.register_student(uuid, text, uuid, text) to service_role;

-- Durable rate limiting: not a per-isolate JavaScript counter that resets on every cold start.
create table private.login_attempts (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null default now(),
  attempts integer not null default 1
);
alter table private.login_attempts enable row level security;
revoke all on private.login_attempts from public, anon, authenticated;
create function public.consume_login_attempt(key_hash text, max_attempts integer default 10) returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer;
begin
  if $2 < 1 or $2 > 60 then raise exception 'Invalid limit'; end if;
  delete from private.login_attempts a where a.window_start < now() - interval '2 hours';
  insert into private.login_attempts as a (key_hash) values ($1)
    on conflict on constraint login_attempts_pkey do update set
      attempts = case when a.window_start < now() - interval '1 minute' then 1 else a.attempts + 1 end,
      window_start = case when a.window_start < now() - interval '1 minute' then now() else a.window_start end
    returning attempts into total;
  return total <= $2;
end;
$$;
revoke all on function public.consume_login_attempt(text, integer) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text, integer) to service_role;

alter table public.progress replica identity full;
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') and
     not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'progress') then
    alter publication supabase_realtime add table public.progress;
  end if;
end $$;
