import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useStudents, useTeachers } from "../api/hooks";
import { fetchAttendance, submitAttendance } from "../api/client";
import { CURRENT_ACADEMIC_YEAR } from "../mocks/data";
import {
  getAttendanceMarkingCapabilities,
  getAvailableClassSections,
  getRoster,
} from "../api/attendanceMarking";
import type { AttendanceMark, AttendanceTargetType } from "../types/domain";

function nextOrLastSunday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? 0 : -day; // most recent Sunday on or before today
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + diff);
  return sunday.toISOString().slice(0, 10);
}

const statusStyles: Record<AttendanceMark, string> = {
  P: "bg-emerald-600 text-white border-emerald-600",
  A: "bg-rose-600 text-white border-rose-600",
  OD: "bg-amber-500 text-white border-amber-500",
};
const unselectedStyle = "border-slate-300 text-slate-600 hover:bg-slate-50";

export default function AttendanceMarking() {
  const { currentUser: user } = useAuth();
  const { data: teachers, loading: teachersLoading, error: teachersError } = useTeachers();
  const { data: students, loading: studentsLoading, error: studentsError } = useStudents();
  const [selectedDate, setSelectedDate] = useState(nextOrLastSunday());
  const [saved, setSaved] = useState(false);

  // Capabilities are pure role-derived UI config (no I/O); roster/sections
  // are backed by the real teacher/student lists fetched above. See
  // src/api/attendanceMarking.ts. `user` is briefly null only for the one
  // render before AppLayout redirects to /login, but hooks must still run
  // unconditionally every render, so the null case falls back to a
  // throwaway role/roster that's never actually shown (see the `!user`
  // bail-out below, placed after every hook call).
  const capabilities = useMemo(
    () => getAttendanceMarkingCapabilities(user?.role ?? "teacher"),
    [user]
  );

  const [targetType, setTargetType] = useState<AttendanceTargetType>(capabilities.defaultTargetType);
  const targetConfig = capabilities.perTargetType[targetType];

  const availableSections = user && targetConfig.classSectionSelectorVisible
    ? getAvailableClassSections(user, targetType, students)
    : [];
  const [selectedSection, setSelectedSection] = useState(availableSections[0] ?? "");

  // `students` (and therefore availableSections) loads asynchronously, so
  // the useState initializer above only ever sees the pre-fetch empty
  // list. Once real sections arrive, adopt the first one unless the
  // current selection is still valid.
  useEffect(() => {
    if (availableSections.length > 0 && !availableSections.includes(selectedSection)) {
      setSelectedSection(availableSections[0]);
    }
  }, [availableSections, selectedSection]);

  const roster = user
    ? getRoster(
        user,
        targetType,
        targetConfig.classSectionSelectorVisible ? selectedSection : undefined,
        teachers,
        students
      )
    : [];

  const [existingMarks, setExistingMarks] = useState<Record<string, AttendanceMark | undefined>>({});
  const [marksLoading, setMarksLoading] = useState(false);
  const [marksError, setMarksError] = useState<string | null>(null);

  // `roster` is a fresh array every render, so it can't be a dependency
  // directly (the effect would refetch, setState, re-render, refetch...
  // forever) - `rosterKey` gives it a stable identity to key off instead.
  const rosterKey = roster.map((p) => p.id).join(",");

  useEffect(() => {
    if (roster.length === 0) {
      setExistingMarks({});
      return;
    }
    let cancelled = false;
    setMarksLoading(true);
    setMarksError(null);
    fetchAttendance(roster.map((p) => p.id), CURRENT_ACADEMIC_YEAR)
      .then((records) => {
        if (cancelled) return;
        const marks: Record<string, AttendanceMark | undefined> = {};
        for (const person of roster) {
          marks[person.id] = records.find((r) => r.personId === person.id)?.data[selectedDate];
        }
        setExistingMarks(marks);
      })
      .catch((err) => {
        if (!cancelled) setMarksError(err instanceof Error ? err.message : "Failed to load attendance");
      })
      .finally(() => {
        if (!cancelled) setMarksLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey, selectedDate]);

  const [draft, setDraft] = useState<Record<string, AttendanceMark>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!user) return null;

  function markFor(personId: string): AttendanceMark | undefined {
    return draft[personId] ?? existingMarks[personId];
  }

  function setMark(personId: string, mark: AttendanceMark) {
    setDraft((d) => ({ ...d, [personId]: mark }));
    setSaved(false);
  }

  function markAllPresent() {
    const next: Record<string, AttendanceMark> = {};
    for (const person of roster) next[person.id] = "P";
    setDraft((d) => ({ ...d, ...next }));
    setSaved(false);
  }

  function handleTargetTypeChange(next: AttendanceTargetType) {
    if (!user) return;
    setTargetType(next);
    const nextSections = capabilities.perTargetType[next].classSectionSelectorVisible
      ? getAvailableClassSections(user, next, students)
      : [];
    setSelectedSection(nextSections[0] ?? "");
    setDraft({});
    setSaved(false);
  }

  function handleSectionChange(next: string) {
    setSelectedSection(next);
    setDraft({});
    setSaved(false);
  }

  function handleDateChange(next: string) {
    setSelectedDate(next);
    setDraft({});
    setSaved(false);
  }

  if (teachersLoading || studentsLoading) {
    return <p className="text-sm text-slate-500">Loading roster…</p>;
  }
  if (teachersError || studentsError) {
    return <p className="text-sm text-rose-600">{teachersError ?? studentsError}</p>;
  }

  const markedCount = roster.filter((p) => markFor(p.id) !== undefined).length;

  // Sunday check - real version will call the backend's is_working_day(),
  // this just mirrors the "day of week" half of that rule for the UI.
  const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;

  async function handleSubmit() {
    const marks = Object.entries(draft).map(([personId, mark]) => ({ personId, date: selectedDate, mark }));
    if (marks.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAttendance(CURRENT_ACADEMIC_YEAR, marks);
      setExistingMarks((prev) => ({ ...prev, ...draft }));
      setDraft({});
      setSaved(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-800">Attendance</h1>
          {capabilities.targetTypeSelector.visible && (
            <select
              className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              value={targetType}
              onChange={(e) => handleTargetTypeChange(e.target.value as AttendanceTargetType)}
            >
              {capabilities.targetTypeSelector.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {targetConfig.classSectionSelectorVisible && (
            <select
              className="flex-1 sm:flex-none border border-slate-300 rounded-md px-2 py-1.5 text-sm"
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              {availableSections.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <input
            type="date"
            className="flex-1 sm:flex-none border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
      </div>

      {!isSunday ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-md p-4 text-sm">
          {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" })}{" "}
          isn't a working day — attendance is only taken on Sundays.
        </div>
      ) : (
        <>
          {marksError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md p-3 text-sm">
              {marksError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={markAllPresent}
              disabled={roster.length === 0}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Mark all as Present
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
            {roster.map((person) => {
              const mark = markFor(person.id);
              return (
                <div
                  key={person.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-4 py-3"
                >
                  <div>
                    <div className="text-slate-800 font-medium text-sm sm:text-base">{person.fullName}</div>
                    <div className="text-xs text-slate-400">{person.id}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {targetConfig.statusOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setMark(person.id, opt.value)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-sm font-medium border ${
                          mark === opt.value ? statusStyles[opt.value] : unselectedStyle
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {roster.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-400 text-center">
                No {targetType === "teacher" ? "teachers" : "students"} to show.
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-sm text-slate-500">
              {marksLoading ? "Loading existing marks…" : `${markedCount} / ${roster.length} marked`} · {CURRENT_ACADEMIC_YEAR}
            </span>
            <div className="flex items-center gap-3">
              {submitError && <span className="text-sm text-rose-600">{submitError}</span>}
              {saved && !submitError && <span className="text-sm text-emerald-600">Saved</span>}
              <button
                onClick={handleSubmit}
                disabled={roster.length === 0 || submitting}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
