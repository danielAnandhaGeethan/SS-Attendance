// Real API client for the FastAPI backend (backend/main.py).
//
// The backend returns raw Supabase rows (snake_case fields, `teacher_ids`
// as a comma-separated string) - the `to*` mappers below convert those
// into the camelCase shapes declared in `types/domain.ts` in one place,
// so every call site gets the same shape the app's types already expect.

import type { AttendanceMark, Student, Teacher, TeacherRole } from "../types/domain";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

interface RawTeacher {
  id: string;
  full_name: string;
  class_section: string;
  role: TeacherRole;
}

interface RawStudent {
  id: string;
  full_name: string;
  dob: string | null;
  contact_no: string | null;
  class_section: string;
  teacher_ids: string | null;
}

function toTeacher(row: RawTeacher): Teacher {
  return {
    id: row.id,
    fullName: row.full_name,
    classSection: row.class_section,
    role: row.role,
  };
}

function toStudent(row: RawStudent): Student {
  return {
    id: row.id,
    fullName: row.full_name,
    dob: row.dob,
    contactNo: row.contact_no,
    classSection: row.class_section,
    teacherIds: (row.teacher_ids ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  };
}

export async function fetchTeachers(): Promise<Teacher[]> {
  const { teachers } = await apiGet<{ teachers: RawTeacher[] }>("/teachers");
  return teachers.map(toTeacher);
}

export async function fetchStudents(): Promise<Student[]> {
  const { students } = await apiGet<{ students: RawStudent[] }>("/students");
  return students.map(toStudent);
}

export interface AttendanceRecord {
  personId: string;
  academicYear: string;
  data: Record<string, AttendanceMark>;
}

export async function fetchAttendance(personIds: string[], academicYear: string): Promise<AttendanceRecord[]> {
  if (personIds.length === 0) return [];
  const params = new URLSearchParams({ person_ids: personIds.join(","), academic_year: academicYear });
  const { attendance } = await apiGet<{ attendance: AttendanceRecord[] }>(`/attendance?${params}`);
  return attendance;
}

export async function submitAttendance(
  academicYear: string,
  marks: { personId: string; date: string; mark: AttendanceMark }[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/attendance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      academic_year: academicYear,
      marks: marks.map((m) => ({ person_id: m.personId, date: m.date, mark: m.mark })),
    }),
  });
  if (!res.ok) {
    throw new Error(`Submitting attendance failed: ${res.status} ${res.statusText}`);
  }
}
