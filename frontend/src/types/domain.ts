// Mirrors the live Supabase schema (see supabase/migrations/0006-0010).
// Keep this in sync manually for now; once the backend API exists this
// should be replaced by generated types instead of hand-written ones.

export type TeacherRole = "teacher" | "volunteer" | "superintendent";

export type AttendanceMark = "P" | "A" | "OD";

export interface Teacher {
  id: string; // "T000001"
  fullName: string;
  classSection: string; // e.g. "Beginner-A" - empty string for volunteers/superintendent, who aren't tied to a section
  role: TeacherRole;
}

export interface Student {
  id: string; // "S000001"
  fullName: string;
  dob: string | null; // ISO date
  contactNo: string | null;
  classSection: string;
  teacherIds: string[]; // parsed from the comma-separated DB column
}

export interface AttendanceYearRecord {
  personId: string;
  academicYear: string; // "2026-2027"
  data: Record<string, AttendanceMark>; // "2026-06-14" -> "P" | "A" | "OD" (column renamed from "dates" to "data" in Supabase)
}

// --- Attendance-marking screen configuration ---
//
// The marking screen (who can mark attendance for whom, whether a target
// type picker or class/section picker is shown, which statuses are
// selectable) is driven entirely by this config object, not by role
// checks inside the component. See src/api/attendanceMarking.ts.

export type AttendanceTargetType = "teacher" | "student";

export interface AttendanceTargetTypeOption {
  value: AttendanceTargetType;
  label: string;
}

export interface AttendanceStatusOption {
  value: AttendanceMark;
  label: string;
}

export interface AttendanceTargetTypeConfig {
  classSectionSelectorVisible: boolean;
  statusOptions: AttendanceStatusOption[];
}

export interface AttendanceMarkingCapabilities {
  targetTypeSelector: {
    visible: boolean;
    options: AttendanceTargetTypeOption[];
  };
  defaultTargetType: AttendanceTargetType;
  perTargetType: Record<AttendanceTargetType, AttendanceTargetTypeConfig>;
}

// A single roster entry to mark attendance for - deliberately the same
// shape whether the underlying person is a teacher or a student, so the
// marking screen doesn't need to know which one it's rendering.
export interface RosterPerson {
  id: string;
  fullName: string;
}
