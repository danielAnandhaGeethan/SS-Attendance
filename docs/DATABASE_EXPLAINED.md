# The Database, Explained in Plain Language

Think of the database as a set of labeled filing cabinets. Each cabinet (called a **table**) stores one kind of information — one cabinet for students, one for levels, one for attendance records, and so on. Each drawer in a cabinet (called a **row**) is one record — one student, one attendance mark, one holiday. Each label on a drawer (called a **column**) is one piece of information about that record — a name, a date, a status.

There are **12 cabinets (tables)** in total. Below, each one is explained: what it's for, and why every column in it exists.

## The organization, in this system's terms

- **Superintendent** — full authority over the whole system: every level, every section, every student and staff record.
- **Teachers** and **Volunteers** — both are "staff" assigned to one or more sections. A volunteer works alongside a teacher in the same section rather than running it alone, but technically both can be assigned to a section and both can mark attendance for the sections they're assigned to. Neither can touch a section they're not assigned to.
- **Students** — never log in; they're just records the staff and Superintendent manage.
- **Levels** — the 7 grades, in order: Tiny Tots, Beginner, Primary, Junior, Intermediate, Senior, Senior High. (In the database these are stored in a table literally called `classes` — same idea, just a more generic technical name.)
- **Sections** — each level is split into one or more sections (e.g. Beginner-A, Beginner-B), and every section needs at least one teacher.

---

## 1. `academic_years` — "Which school year is this?"

Every record in the system needs to know which year it belongs to, so the same section name ("Beginner-A") can be reused year after year without clashing.

| Column | Why it exists |
|---|---|
| `label` | The human-readable name, e.g. "2026-2027", so staff can pick the right year from a dropdown. |
| `start_date` / `end_date` | Marks when the year begins and ends — used to figure out which year a given attendance date falls into. |
| `is_current` | A flag so the system always knows which year is "active right now" without staff having to select it every time. |

---

## 2. `classes` — "Which level?"

The 7 levels in the school: Tiny Tots, Beginner, Primary, Junior, Intermediate, Senior, Senior High. (Called `classes` in the database as a generic technical name — it means "level" here, not a specific numbered grade.)

| Column | Why it exists |
|---|---|
| `name` | The level name shown to staff, e.g. "Beginner". |
| `order_index` | The sort order (1 through 7) so levels always list Tiny Tots → Senior High, in the correct sequence, instead of alphabetically. |

---

## 3. `sections` — "Which section within a level?"

Each level is split into one or more sections (e.g. Beginner-A, Beginner-B). This is where that split is recorded.

| Column | Why it exists |
|---|---|
| `class_id` | Links the section back to its level — "this section belongs to Beginner". |
| `academic_year_id` | Sections can differ year to year (a level might have 2 sections one year and 3 the next), so each section is tied to a specific year. |
| `name` | The section's own name/letter, e.g. "A". |
| `capacity` | Optional — how many students the section is meant to hold, useful for the Superintendent tracking overcrowding. |

---

## 4. `profiles` — "Who is this staff member, and what can they do?"

Every person who logs in — Superintendent, Teacher, or Volunteer — has one record here. This is what decides what a person is *allowed to see and do* in the system.

| Column | Why it exists |
|---|---|
| `id` | Directly tied to their login account, so the system knows who is currently logged in. |
| `full_name` | Shown throughout the app — on rosters, in "marked by" fields, etc. |
| `role` | The single most important column here: is this person the `superintendent`, a `teacher`, or a `volunteer`? This decides what buttons/pages/data they can access. |
| `phone` | Contact info, useful for outreach. |
| `is_active` | Lets the Superintendent "switch off" a staff member's access (e.g. they've left) without deleting their history. |

---

## 5. `students` — "Who is this student?"

The master record for every child in the school, independent of which section they're currently in (so a student's history follows them even if they change sections or move up a level).

| Column | Why it exists |
|---|---|
| `admission_no` | The official, unique admission/roll number the school already uses to identify a student. |
| `full_name` | Displayed everywhere — attendance sheets, reports. |
| `date_of_birth`, `gender` | Basic demographic info schools are expected to keep on record. |
| `guardian_name`, `guardian_contact` | So the school can reach a parent/guardian directly — critical for the "at-risk / repeated absence" alerts. |
| `status` | Is the student `active`, `inactive`, `transferred`, or `graduated`? Keeps old students' historical attendance intact without them cluttering current lists. |

---

## 6. `student_section_enrollments` — "Which section is this student in, this year?"

This is the link between a student and a section, **for a specific year**. It exists as its own cabinet (rather than just a column on `students`) because a student's section changes every year, and the system needs to remember *history* — which section they were in last year, not just this year.

| Column | Why it exists |
|---|---|
| `student_id` / `section_id` | The actual link — "this student is in this section". |
| `academic_year_id` | Which year this enrollment applies to. |
| `roll_no` | The student's seat/roll number within that section — used for ordering the attendance sheet. |
| `joined_date` / `left_date` | Handles students who join or leave mid-year (transfers), so attendance before/after those dates is correctly attributed. |

---

## 7. `section_staff_assignments` — "Which staff member (teacher or volunteer) is attached to which section?"

This is what powers the security model — a teacher or volunteer can only mark/view attendance for sections they're actually assigned to. It's a flat list: no ranking of "primary" vs "secondary" staff — everyone assigned to a section has the same rights over it, whether they're a Teacher or a Volunteer.

| Column | Why it exists |
|---|---|
| `staff_id` / `section_id` | The link — "this staff member is attached to this section". |
| `academic_year_id` | Assignments can change every year (a teacher might move from Beginner-A to Junior-B next year). |
| `subject` | Optional info field — if a staff member helps with one particular subject in that section, note it here. Doesn't affect their permissions, just informational. |

---

## 8. `holidays` — "Which dates is school closed?"

The school only runs on Sundays, but not every Sunday — the first Sunday of each month is a holiday, plus any other Sundays the Superintendent chooses to configure as closed. This table (plus a small helper rule) is what tells the system which dates attendance should even be expected on.

| Column | Why it exists |
|---|---|
| `holiday_date` | The specific date that's a holiday. |
| `reason` | Human-readable explanation, e.g. "First Sunday of the month" or "Founder's Day" — shown to staff so a blank attendance day is explained, not mistaken for a missed entry. |
| `source` | Was this holiday auto-generated by the "first Sunday" rule, or manually added by the Superintendent (e.g. an unplanned closure)? Helps distinguish system-generated entries from one-off decisions. |

*(There's also a small rule built into the system — not a table, but worth explaining: "is this a working day?" — which automatically checks "is it a Sunday, AND is it NOT in the holidays list?" This is what prevents attendance from being marked, or expected, on non-working days.)*

---

## 9. `attendance_sessions` — "Was attendance taken for this section, on this day?"

Before individual student marks are recorded, there needs to be a record that "attendance-taking happened" for a section on a given date. Think of it as the cover sheet on top of a stack of individual attendance marks.

| Column | Why it exists |
|---|---|
| `section_id` / `session_date` | Which section, on which day. |
| `marked_by` | Which staff member actually took the attendance — accountability and the basis for punctuality tracking. |
| `marked_at` | The exact time it was submitted — used to flag late/last-minute marking. |
| `is_locked` | Once finalized, the Superintendent can "lock" a day's attendance so it can't be silently edited later — protects data integrity for official records. |

---

## 10. `student_attendance_records` — "Was this specific student present, absent, late, or excused?"

The actual attendance mark for one student, on one day. This is the core data the entire analytics layer is built on top of.

| Column | Why it exists |
|---|---|
| `session_id` | Which day/section this mark belongs to. |
| `student_id` | Which student this mark is for. |
| `status` | `present`, `absent`, `late`, or `excused` — the actual attendance value. |
| `remarks` | Free-text note, e.g. "Sick leave — informed by parent". |
| `updated_by` / `updated_at` | Tracks who last changed this specific mark and when — so if a mark is corrected after the fact, there's a trail. |

---

## 11. `staff_attendance_records` — "Was this staff member present, absent, on duty, or on leave?"

Mirrors student attendance, but for Teachers and Volunteers — including their arrival time, which is what enables punctuality tracking.

| Column | Why it exists |
|---|---|
| `staff_id` / `attendance_date` | Which staff member, which day. |
| `status` | `present`, `absent`, `od` (on-duty — e.g. away for official school work), or `leave`. |
| `in_time` / `out_time` | Arrival and departure time — the basis for detecting late arrivals. |
| `od_reason` | If marked "on duty", why — e.g. "Attending district training". |
| `marked_by` | Who recorded this — staff don't self-mark their own attendance, to prevent self-reported inaccuracies. |

---

## 12. `audit_log` — "Who changed what, and when?"

A safety-net record of every important change made in the system — a paper trail in case something needs to be investigated or corrected later (e.g. "why does this student's attendance from last month look different now?").

| Column | Why it exists |
|---|---|
| `table_name` / `record_id` | Which record, in which cabinet, was touched. |
| `action` | Was it created (`insert`), changed (`update`), or removed (`delete`)? |
| `old_value` / `new_value` | A snapshot of what it looked like before and after — so changes can be reversed or explained if disputed. |
| `changed_by` / `changed_at` | Who made the change and when. |

---

## The 5 "Summary" Views — pre-built reports, not separate cabinets

These aren't cabinets you put things into — they're **automatically generated reports** that read from the cabinets above and do the math for you, live, every time someone looks at them.

- **`section_attendance_summary`** — for one section, on one day: how many present, absent, late, excused, and the attendance %.
- **`class_attendance_summary`** — the same thing, but rolled up across all sections in a level.
- **`school_attendance_summary`** — the same thing again, rolled up for the whole school.
- **`student_streaks`** — flags students currently on a run of consecutive absences (the "at-risk student" alert).
- **`staff_attendance_summary`** — for each staff member: total present/absent/on-duty/leave days, their average arrival time, and how many days they arrived late.

## Who can see/touch what (in plain terms)

- **The Superintendent** can see and edit everything, everywhere.
- **Teachers and Volunteers** can only see and mark attendance for the sections they're personally assigned to — they cannot see or touch a section they're not attached to. Both roles have identical technical permissions; the Teacher/Volunteer distinction is for reporting and org-chart purposes, not a permissions tier.
- **Reference information** everyone needs regardless of role — the list of levels, sections, academic years, and holidays — is visible to any signed-in staff member (but only the Superintendent can add/change it).
- Every staff member can see their own profile and update their own contact details, but only the Superintendent can change someone's role or deactivate an account.
