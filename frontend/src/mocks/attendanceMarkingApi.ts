// TEMPORARY MOCK BACKEND for the attendance-marking screen.
//
// Everything in this file stands in for real API endpoints. The two
// functions below are written to look and behave like network calls
// (same input, same output shape, no side effects on the UI) so that
// swapping them for real `fetch`/API-client calls later is a one-file
// change - the AttendanceMarking page only ever reads the returned
// objects and renders what they say. It never checks `currentUser.role`
// or branches on it directly; all of that logic is isolated here.
//
// DELETE THIS FILE (and its two call sites in AttendanceMarking.tsx) once
// the real backend endpoints exist, and point those call sites at the
// real API client instead. No other frontend code should need to change.

import type {
  Teacher,
  AttendanceMarkingCapabilities,
  AttendanceTargetType,
  RosterPerson,
} from "../types/domain";
import { mockTeachers, mockStudents } from "./data";

/**
 * Mirrors: GET /attendance/marking-capabilities
 *
 * Tells the UI what to render for the current user: whether they get a
 * "Teachers / Students" picker, whether a class/section picker applies,
 * and which status options (P/A, or P/A/OD) are selectable - all as data,
 * not something the component decides for itself.
 */
export function getAttendanceMarkingCapabilities(
  currentUser: Teacher
): AttendanceMarkingCapabilities {
  const canChooseTarget = currentUser.role === "volunteer" || currentUser.role === "superintendent";

  return {
    targetTypeSelector: {
      visible: canChooseTarget,
      options: [
        { value: "teacher", label: "Teachers" },
        { value: "student", label: "Students" },
      ],
    },
    // Teachers only ever mark their own students, so "student" is always
    // the effective/default target type for everyone.
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

/**
 * Mirrors: GET /attendance/sections?targetType=student
 *
 * The list of class/section options to offer, for whichever target type
 * is currently selected. Only ever called when the capabilities response
 * said the class/section picker is visible for that target type.
 */
export function getAvailableClassSections(
  currentUser: Teacher,
  targetType: AttendanceTargetType
): string[] {
  if (targetType === "teacher") return [];

  const relevantStudents =
    currentUser.role === "teacher"
      ? mockStudents.filter((s) => s.teacherIds.includes(currentUser.id))
      : mockStudents; // volunteer/superintendent marking students: every section in the school

  return [...new Set(relevantStudents.map((s) => s.classSection))].sort();
}

/**
 * Mirrors: GET /attendance/roster?targetType=student&classSection=Beginner-A
 *
 * The actual list of people to show on the marking screen, already
 * scoped to whatever the current user is allowed to see - a plain teacher
 * only ever gets their own assigned students back, regardless of what
 * classSection is passed in.
 */
export function getRoster(
  currentUser: Teacher,
  targetType: AttendanceTargetType,
  classSection: string | undefined
): RosterPerson[] {
  if (targetType === "teacher") {
    return mockTeachers
      .filter((t) => t.role === "teacher")
      .map((t) => ({ id: t.id, fullName: t.fullName }));
  }

  let students = mockStudents;
  if (currentUser.role === "teacher") {
    students = students.filter((s) => s.teacherIds.includes(currentUser.id));
  }
  if (classSection) {
    students = students.filter((s) => s.classSection === classSection);
  }
  return students.map((s) => ({ id: s.id, fullName: s.fullName }));
}
