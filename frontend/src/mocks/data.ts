import type { Teacher, Student, AttendanceYearRecord } from "../types/domain";

export const CURRENT_ACADEMIC_YEAR = "2026-2027";

export const mockTeachers: Teacher[] = [
  { id: "T000001", fullName: "Grace Peters", classSection: "Beginner-A", role: "teacher" },
  // Volunteers are never tied to a section - classSection stays empty.
  // Volunteers also always have unique names (no disambiguation needed
  // for them at login).
  { id: "T000002", fullName: "Daniel Osei", classSection: "", role: "volunteer" },
  { id: "T000003", fullName: "Meera Nair", classSection: "Junior-B", role: "teacher" },
  { id: "T000004", fullName: "Samuel Roy", classSection: "Senior-A", role: "teacher" },
  { id: "T000005", fullName: "Alice Fernandes", classSection: "", role: "superintendent" },
  // Intentional name collision with T000001, different section - teachers
  // (unlike volunteers) can share a name, so this exercises the "which
  // section do you belong to" login disambiguation step.
  { id: "T000006", fullName: "Grace Peters", classSection: "Senior-A", role: "teacher" },
];

export const mockStudents: Student[] = [
  { id: "S000001", fullName: "Aarav Kumar", dob: "2020-03-14", contactNo: "9000000001", classSection: "Beginner-A", teacherIds: ["T000001", "T000002"] },
  { id: "S000002", fullName: "Diya Sharma", dob: "2020-07-02", contactNo: "9000000002", classSection: "Beginner-A", teacherIds: ["T000001", "T000002"] },
  { id: "S000003", fullName: "Kabir Singh", dob: "2020-01-22", contactNo: "9000000003", classSection: "Beginner-A", teacherIds: ["T000001"] },
  { id: "S000004", fullName: "Ira Patel", dob: "2016-11-09", contactNo: "9000000004", classSection: "Junior-B", teacherIds: ["T000003"] },
  { id: "S000005", fullName: "Vihaan Rao", dob: "2016-05-30", contactNo: "9000000005", classSection: "Junior-B", teacherIds: ["T000003"] },
];

export const mockAttendance: AttendanceYearRecord[] = [
  {
    personId: "S000001",
    academicYear: CURRENT_ACADEMIC_YEAR,
    data: { "2026-06-07": "P", "2026-06-14": "A", "2026-06-28": "P" },
  },
  {
    personId: "S000002",
    academicYear: CURRENT_ACADEMIC_YEAR,
    data: { "2026-06-07": "P", "2026-06-14": "P", "2026-06-28": "P" },
  },
  {
    personId: "S000003",
    academicYear: CURRENT_ACADEMIC_YEAR,
    data: { "2026-06-07": "A", "2026-06-14": "A", "2026-06-28": "P" },
  },
  {
    personId: "T000001",
    academicYear: CURRENT_ACADEMIC_YEAR,
    data: { "2026-06-07": "P", "2026-06-14": "OD" },
  },
];
