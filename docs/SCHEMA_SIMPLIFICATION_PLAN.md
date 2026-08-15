# Schema Simplification Plan — for review, nothing applied yet

You asked to cut down to 3 tables: Teachers, Students, Attendance. Below is the current proposed column list for each, with your decisions on Flags 1-5 folded in. Two flags (holidays, audit trail) are still open — see the bottom. Nothing here has been applied to Supabase yet.

## Proposed columns

### `people` (new — a small supporting table, not one you asked for directly)

This is the piece that makes a single `person_id` column in `attendance` possible while keeping a real foreign key. A plain text column with no shared parent can't be validated by the database — anyone could type a nonexistent ID into it and Postgres would have no way to object. `people` closes that gap: `teachers` and `students` both register their ID here, and `attendance` points at this one table instead of needing two separate nullable columns.

| Column | Type | Notes |
|---|---|---|
| `id` | text, primary key | The prefixed ID itself, e.g. `T000001` or `S000004` |
| `person_type` | enum: `teacher`, `student` | Which kind of person this ID belongs to |

### `teachers`

| Column | Type | Notes |
|---|---|---|
| `id` | text, primary key, references `people.id` | Auto-generated as `T000001`, `T000002`, ... by a database trigger — never set by the app |
| `full_name` | text, required | |
| `class_section` | text, required | Single combined field, e.g. `"Beginner-A"` — splitting into level/section happens in the backend, not the database |
| `role` | enum: `teacher`, `volunteer`, `superintendent` | **Resolved:** Superintendent lives here as a third role value, not a separate table |

### `students`

| Column | Type | Notes |
|---|---|---|
| `id` | text, primary key, references `people.id` | Auto-generated as `S000001`, `S000002`, ... by a database trigger — never set by the app |
| `full_name` | text, required | |
| `dob` | date | **Resolved:** `age` column dropped — `dob` is the only source of truth, age computed wherever needed |
| `contact_no` | text | |
| `class_section` | text, required | Same combined format as `teachers.class_section`; split handled in the backend |
| `teacher_ids` | text | **Resolved:** comma-separated teacher IDs (e.g. `"T000001,T000002"`) instead of a single FK — see note below |

### `attendance`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid, primary key | |
| `person_id` | text, references `people.id` | The single column you asked for — holds either a teacher's or a student's ID, and the prefix (`T`/`S`) tells you which without needing a second column |
| `attendance_date` | date, required | |
| `status` | enum: `present`, `absent` | **Resolved:** only these two values stored; late/OD/leave/excused-type logic is computed in the backend, not stored as distinct database states |

**How the prefix gets generated:** two database sequences (`teacher_id_seq`, `student_id_seq`) plus a small trigger on each of `teachers` and `students`. On insert, the trigger stamps the new row's `id` as `'T' || next value, zero-padded to 6 digits`, inserts the matching row into `people`, and only then lets the `teachers`/`students` insert complete. The app just says "add this teacher" with no ID at all — the database hands one back, already prefixed, guaranteed unique, and already validated against `people` for anything that references it later (like `attendance.person_id`).

A uniqueness rule on `attendance` (one row per person per date) would also stop the same person being marked twice on the same date.

### Note on `students.teacher_ids` being comma-separated text

Worth being explicit about the trade-off, since it's a real one: a comma-separated text field can't be enforced by a foreign key the way a normal reference column can. The database won't catch a typo'd or deleted teacher ID sitting inside that string, and pulling "all students taught by T000002" means a text-search (`teacher_ids LIKE '%T000002%'`) rather than a clean join — slower and a little fragile (e.g. `T00001` would also match inside `T000012` without careful delimiter handling). This is a deliberate simplicity-over-integrity trade you've chosen, and it's a reasonable one for a small school's dataset size — just flagging it so it's a known trade, not a surprise later.

## Tables this removes from the current live database

`academic_years`, `classes`, `sections`, `profiles`, `student_section_enrollments`, `section_staff_assignments`, `holidays`, `attendance_sessions`, `audit_log`, plus all 5 analytics views (built on top of tables being removed — they'd need to be rebuilt from scratch against the new flat structure, in the backend rather than as database views, per your decision on Flag 5).

`students` and the attendance table survive, restructured as above. One new table (`people`) is added — small internal plumbing needed to make the single-column `attendance.person_id` design work safely.

## Still open — need your call before I touch anything

**Holidays.** Removing the `holidays` table means the Sunday-only / first-Sunday-auto-holiday / manually-configured-extra-holiday rule has no data to check against in the database. If this logic is moving to the backend entirely (e.g. a hardcoded rule + a config list), that works, but "configure a few extra Sundays as holidays ourselves" was an explicit requirement early on, and that needs *some* persistent place to live — even a one-column table, or otherwise it has to be redeployed every time a new holiday needs adding. Confirming whether this should still be a (very small) database table, or fully backend-side.

**Accountability / audit trail.** Removing `audit_log` and the day-locking (`is_locked`) concept means no more "who changed this mark and when" and no more "lock a finalized day so it can't be silently edited." If that's not needed for this app, fine — just confirming it's intentional, since it's the kind of thing that's cheap to add now and expensive to reconstruct retroactively.
