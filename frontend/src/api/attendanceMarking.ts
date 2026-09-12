// Attendance-marking screen configuration, backed by real teacher/student
// data instead of the mocks this used to read from (see git history for
// the old mocks/attendanceMarkingApi.ts). The backend has no endpoint yet
// for the actual attendance marks themselves (reading or saving P/A/OD per
// date) - that part of AttendanceMarking.tsx still runs against local
// mock data until those endpoints exist.

import type {
  Teacher,
  TeacherRole,
  Student,
  AttendanceMarkingCapabilities,
  AttendanceTargetType,
  RosterPerson,
} from "../types/domain";

/** Mirrors: GET /attendance/marking-capabilities */
export function getAttendanceMarkingCapabilities(
  role: TeacherRole
): AttendanceMarkingCapabilities {
  const canChooseTarget = role === "volunteer" || role === "superintendent";

  return {
    targetTypeSelector: {
      visible: canChooseTarget,
      options: [
        { value: "teacher", label: "Teachers" },
        { value: "student", label: "Students" },
      ],
    },
    defaultTargetType: "student",
    perTargetType: {
      teacher: {
        classSectionSelectorVisible: false,
        statusOptions: [
          { value: "P", label: "Present" },
          { value: "A", label: "Absent" },
          { value: "OD", label: "OD" },
        ],
      },
      student: {
        classSectionSelectorVisible: true,
        statusOptions: [
          { value: "P", label: "Present" },
          { value: "A", label: "Absent" },
        ],
      },
    },
  };
}

/** Mirrors: GET /attendance/sections?targetType=student */
export function getAvailableClassSections(
  currentUser: Teacher,
  targetType: AttendanceTargetType,
  students: Student[]
): string[] {
  if (targetType === "teacher") return [];

  const relevantStudents =
    currentUser.role === "teacher"
      ? students.filter((s) => s.teacherIds.includes(currentUser.id))
      : students; // volunteer/superintendent marking students: every section in the school

  return [...new Set(relevantStudents.map((s) => s.classSection))].sort();
}

/** Mirrors: GET /attendance/roster?targetType=student&classSection=Beginner-A */
export function getRoster(
  currentUser: Teacher,
  targetType: AttendanceTargetType,
  classSection: string | undefined,
  teachers: Teacher[],
  students: Student[]
): RosterPerson[] {
  if (targetType === "teacher") {
    // A superintendent marks attendance for the whole staff, teachers and
    // volunteers alike; a volunteer marking "Teachers" only ever sees
    // actual teachers (there's no one above them but the superintendent).
    const includedRoles: TeacherRole[] =
      currentUser.role === "superintendent" ? ["teacher", "volunteer"] : ["teacher"];
    return teachers
      .filter((t) => includedRoles.includes(t.role))
      .map((t) => ({ id: t.id, fullName: t.fullName }));
  }

  let filtered = students;
  if (currentUser.role === "teacher") {
    filtered = filtered.filter((s) => s.teacherIds.includes(currentUser.id));
  }
  if (classSection) {
    filtered = filtered.filter((s) => s.classSection === classSection);
  }
  return filtered.map((s) => ({ id: s.id, fullName: s.fullName }));
}
