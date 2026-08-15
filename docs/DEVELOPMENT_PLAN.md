# Development Plan — Backend + Frontend

This document lays out the **build steps** and the **logical algorithm** for each major piece of the app, before any code is written. Each section starts with a plain-language explanation, followed by the technical step-by-step.

## The organization this app serves

- **Superintendent** — full authority, sees and edits everything.
- **Teachers** and **Volunteers** — both are "staff" who get assigned to one or more sections and can mark attendance for those sections. Technically identical permissions; the distinction is organizational (a volunteer works alongside a teacher, not solo) and useful for reporting, not a separate access tier.
- **Students** — never log in, just records staff manage.
- **Levels** (Tiny Tots → Senior High) each split into one or more **sections**, and every section needs at least one teacher.

## How the pieces fit together

```
[ React app in the browser ]
          |
          |  (asks for data / sends attendance marks)
          v
[ FastAPI backend ]
          |
          |  (reads/writes, with row-level security rules)
          v
[ Supabase / Postgres database ]  <-- already built and live
```

In plain terms: a teacher or volunteer clicks around in a **web page** (the frontend). Every click that needs data — "show me today's roster", "save these attendance marks" — sends a request to a **middleman program** (the backend), which is the only thing allowed to talk directly to the **database**. The backend also enforces school-specific rules (like "you can't mark attendance on a holiday") before the database's own security rules kick in as a second layer of protection.

---

## PART 1 — Backend (FastAPI) — Development Steps

### Step-by-step build order

1. **Project setup** — FastAPI app skeleton, connect to Supabase Postgres, environment config (URLs, secret keys never hardcoded).
2. **Authentication bridge** — verify the login token Supabase Auth issues, so the backend knows "who is asking" on every request.
3. **Reference-data endpoints** — read-only APIs for academic years, levels, sections, holidays (needed by the frontend to populate dropdowns before anything else can work).
4. **Holiday-calendar logic** — the "is this a working day?" rule, plus the auto-generation of "first Sunday of the month" holidays for a given year.
5. **Roster endpoints** — "give me the list of students in section X, for year Y" (used to build the attendance-marking screen).
6. **Attendance-marking endpoints** — create a session for a section+day, save each student's status, lock a day once finalized.
7. **Staff attendance endpoints** — the Superintendent marks a teacher/volunteer present/absent/OD/leave with in/out time.
8. **Analytics endpoints** — wrap the pre-built database summary views (section/level/school %, streaks, staff punctuality) into clean API responses the frontend can chart directly.
9. **Audit trail wiring** — make sure every create/update/delete on attendance data writes an entry to `audit_log`.
10. **Error handling & validation** — reject bad input early (e.g. marking attendance for a non-working day, or a section a staff member isn't assigned to) with clear error messages.
11. **API documentation** — FastAPI auto-generates this, but review/clean it up so the frontend developer (or you, reviewing) can see every available endpoint.

### The algorithm — plain language first

> When a teacher or volunteer opens their attendance screen, the backend: figures out who's asking → checks which sections they're allowed to touch → checks if today is even a working day → if yes, fetches the roster for that section and today's existing marks (if any) → sends it all back as one neat package. When they submit marks, the backend: re-checks permissions → re-checks it's a working day → re-checks the day isn't locked → saves each student's mark → timestamps and records who did it.

### The algorithm — technical steps

**A. Request identity & permission check** (runs on almost every request)
```
1. Read the auth token attached to the incoming request
2. Ask Supabase Auth: "whose token is this, and is it valid?"
3. Look up that person's row in `profiles` → get their role
4. If the request touches a specific section:
     check `section_staff_assignments` (or superintendent role) to confirm
     this person is allowed to touch that section
   → if not allowed, reject with 403 Forbidden
```

**B. "Get today's attendance screen for section X"**
```
1. Run permission check (A) for section X
2. Determine today's date (or the date parameter passed in)
3. Run is_working_day(date):
     - is it a Sunday? AND
     - is it NOT in the holidays table?
   → if not a working day, respond "no attendance expected today" + reason
4. Fetch active students in section X via student_section_enrollments
   (ordered by roll_no)
5. Check if an attendance_session already exists for (section X, date):
     - if yes, fetch existing student_attendance_records and merge
       them into the roster (so partially-marked days can be resumed)
     - if no, return the roster with everyone "unmarked"
6. Return: { roster, existing_marks, is_locked, is_working_day }
```

**C. "Submit attendance for section X, date D"**
```
1. Run permission check (A) for section X
2. Re-run is_working_day(D) → reject if not a working day
3. Find or create the attendance_session row for (section X, D)
4. If session.is_locked → reject with "this day is already finalized"
5. For each (student_id, status, remarks) in the submitted list:
     upsert into student_attendance_records
     (insert if new, update if a mark already exists)
     set updated_by = current user, updated_at = now
6. Set session.marked_by = current user, session.marked_at = now
7. Write an audit_log entry summarizing the change
8. Return success + the final saved state
```

**D. "Lock a day" (Superintendent only)**
```
1. Confirm requester is the Superintendent
2. Set attendance_sessions.is_locked = true for the given section+date
3. Log the lock action to audit_log
```

**E. Holiday auto-generation** (run once per new academic year, or on a schedule)
```
1. For each month between academic_year.start_date and end_date:
     find the first Sunday of that month
     if it's not already in `holidays`, insert it with source = 'auto_rule'
```

**F. Analytics endpoints** (thin wrappers)
```
1. Run permission check (Superintendent sees all; teachers/volunteers see
   only their assigned sections)
2. Query the relevant summary view (section/level/school/streaks/staff)
   with the requested filters (date range, section, level)
3. Shape the result into a clean JSON response for charts/tables
```

---

## PART 2 — Frontend (React + TypeScript) — Development Steps

### Step-by-step build order

1. **Project setup** — React + TypeScript app, routing, and a typed API client generated from the backend's OpenAPI spec (so frontend and backend never drift out of sync on data shapes).
2. **Login screen** — connects to Supabase Auth; after login, redirect based on role.
3. **App shell / navigation** — a layout that shows different menu options depending on role (the Superintendent sees "Manage Students", "Manage Staff"; teachers/volunteers don't).
4. **Dashboard (role-aware home screen)**:
   - Superintendent: school-wide today's attendance %, at-risk student alerts, staff punctuality snapshot.
   - Teacher/Volunteer: "you have N sections; today's status for each."
5. **Attendance-marking screen** — the daily core workflow (detailed algorithm below).
6. **Management screens** — add/edit students, sections, staff assignments, holidays (Superintendent only).
7. **Analytics/reports screens** — charts and tables for section/level/school trends, at-risk list, staff punctuality.
8. **Staff self-service** — view own attendance history (read-only).
9. **Polish** — loading states, error messages, empty states (e.g. "today is a holiday" screen), mobile-friendly layout since staff may mark attendance from a phone.

### The algorithm — plain language first

> When a teacher or volunteer opens the app, it asks the backend "who am I and what can I see", then shows only their sections. When they pick a section, it asks "give me today's roster" — if today isn't a working day, it shows a friendly "no attendance today" message instead of a blank form. Otherwise, it shows every student with tap-able Present/Absent/Late/Excused buttons, pre-filled if already marked earlier. Tapping "Submit" sends all the marks to the backend in one go, and the screen confirms success or shows exactly what went wrong.

### The algorithm — technical steps

**A. App startup**
```
1. Check for an existing Supabase Auth session
2. If none → show login screen
3. If present → fetch the user's profile (role, name) from the backend
4. Store role in app-wide state → drives which nav items/routes render
```

**B. Attendance-marking screen**
```
1. On load: fetch the list of sections this user is assigned to
   (the Superintendent gets a full section picker instead)
2. On selecting a section (+ optionally a date, default = today):
     call "get today's attendance screen" endpoint (Backend step B)
3. If response says "not a working day":
     render a simple message with the reason (e.g. "Holiday: First
     Sunday of the month") — no form shown
4. Else:
     render the roster as a list; each row = student name, roll no,
     and a 4-way status selector (Present/Absent/Late/Excused),
     pre-selected from `existing_marks` if present
     if session.is_locked → render read-only (no edits allowed)
5. Track local edits in component state as the user taps through
6. On "Submit":
     - client-side check: has every student been marked? if not, warn
       but allow submitting partial (staff may finish later)
     - send the full list of (student_id, status, remarks) to the
       backend submit endpoint
     - on success: show a confirmation, update local "already marked"
       indicator
     - on error: show the specific reason returned by the backend
       (e.g. "this day is locked", "not your section")
```

**C. Dashboard**
```
1. On load, call the appropriate analytics endpoint(s) based on role
2. Render:
     - a summary stat (today's attendance %)
     - a short at-risk list (students flagged by student_streaks)
     - (Superintendent only) a staff punctuality snapshot
3. Each stat links through to the fuller analytics screen for detail
```

**D. Analytics/reports screen**
```
1. Provide filters: date range, level, section
2. On filter change, call the matching analytics endpoint
3. Render as a chart (trend over time) + a table (breakdown by
   section/level) — reusing one chart component across all three
   summary levels (section/level/school) since their data shape
   is identical
```

**E. Management screens (students, sections, staff, holidays)**
```
1. Standard list + add/edit/delete pattern, one per entity
2. Every write action calls the matching backend endpoint, which
   in turn is protected by "Superintendent only" backend + database rules
3. Deleting is generally avoided in favor of status flags (e.g. mark
   a student "transferred" instead of deleting their record), to
   preserve attendance history
```

---

## Review checklist before development starts

- [ ] Confirm whether partial-day submission (marking some students now, rest later) is wanted, or attendance must be all-or-nothing per session.
- [ ] Confirm who is allowed to "unlock" a locked day if a mistake is found after the fact (only the Superintendent, presumably).
- [ ] Confirm what "at-risk" means in numbers — how many consecutive absences should trigger an alert?
- [ ] Confirm whether teachers/volunteers need the app on mobile browsers specifically (affects frontend layout priority).
- [ ] Confirm whether a Volunteer must always be paired with an actively-assigned Teacher in the same section, or can a section be staffed by volunteers alone (this is a business rule, not currently enforced by the database — worth deciding before building the staff-assignment screen).
