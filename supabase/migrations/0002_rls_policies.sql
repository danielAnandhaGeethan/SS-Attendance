-- RLS helper functions and policies for the schema in 0001_initial_schema.sql.
--
-- Permission model:
--   Superintendent   - full access everywhere.
--   Teacher/Volunteer- can see the full staff directory and every section/
--                      academic-year row (reference-data style tables have
--                      none here, but the pattern is: select-all, write via
--                      is_superintendent() only); can only see/mark
--                      students they appear in `teacher_ids` for, full
--                      access to those students' attendance, and read-only
--                      access to their own attendance record.

create function current_teacher_id() returns text
language sql stable security definer set search_path = public as $$
  select id from teachers where auth_user_id = auth.uid();
$$;

create function is_superintendent() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role from teachers where auth_user_id = auth.uid()) = 'superintendent',
    false
  );
$$;

-- Checks whether the signed-in teacher/volunteer appears inside a
-- comma-separated teacher_ids string, without false-positiving on
-- substrings (e.g. T000001 should not match inside T0000012).
create function teaches_student(target_teacher_ids text) returns boolean
language sql stable security definer set search_path = public as $$
  select target_teacher_ids is not null
    and current_teacher_id() is not null
    and target_teacher_ids ~ ('(^|,)\s*' || current_teacher_id() || '\s*(,|$)');
$$;

-- Supabase grants EXECUTE to the PUBLIC pseudo-role at function creation
-- time; anon/authenticated inherit that regardless of a direct per-role
-- revoke, so PUBLIC itself has to be revoked from. The three trigger
-- functions from 0001 aren't meant to be called directly via RPC by
-- anyone at all - only the trigger mechanism itself needs to run them.
revoke execute on function assign_teacher_id() from public;
revoke execute on function assign_student_id() from public;
revoke execute on function cleanup_person_on_delete() from public;
revoke execute on function current_teacher_id() from public;
revoke execute on function is_superintendent() from public;
revoke execute on function teaches_student(text) from public;

grant execute on function current_teacher_id() to authenticated;
grant execute on function is_superintendent() to authenticated;
grant execute on function teaches_student(text) to authenticated;

alter table people enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table attendance enable row level security;

create policy people_select on people for select to authenticated using (true);
create policy people_admin_write on people for all to authenticated using (is_superintendent()) with check (is_superintendent());

create policy teachers_select on teachers for select to authenticated using (true);
create policy teachers_admin_write on teachers for all to authenticated using (is_superintendent()) with check (is_superintendent());

create policy students_admin_all on students for all to authenticated using (is_superintendent()) with check (is_superintendent());
create policy students_teacher_select on students for select to authenticated using (teaches_student(teacher_ids));

create policy attendance_admin_all on attendance for all to authenticated using (is_superintendent()) with check (is_superintendent());
create policy attendance_teacher_student_all on attendance for all to authenticated using (
  exists (select 1 from students s where s.id = attendance.person_id and teaches_student(s.teacher_ids))
) with check (
  exists (select 1 from students s where s.id = attendance.person_id and teaches_student(s.teacher_ids))
);
create policy attendance_self_select on attendance for select to authenticated using (
  person_id = current_teacher_id()
);
