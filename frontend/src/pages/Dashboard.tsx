import { useState } from "react";
import { useMockAuth } from "../context/MockAuthContext";
import { mockStudents, mockTeachers } from "../mocks/data";
import StudentsTable from "../components/StudentsTable";
import TeachersTable from "../components/TeachersTable";

export default function Dashboard() {
  const { currentUser } = useMockAuth();

  // Volunteers have the same access as the Superintendent - both get the
  // full school-wide view, not the narrower "your assigned sections" view
  // that only makes sense for a teacher tied to specific students.
  const hasBroadAccess = currentUser.role === "superintendent" || currentUser.role === "volunteer";

  if (hasBroadAccess) {
    return <BroadOverview />;
  }

  const mySections = [...new Set(
    mockStudents.filter((s) => s.teacherIds.includes(currentUser.id)).map((s) => s.classSection)
  )];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Welcome, {currentUser.fullName}</h1>
      <p className="text-slate-600">
        You're assigned to {mySections.length} section{mySections.length === 1 ? "" : "s"}:
      </p>
      <ul className="flex flex-wrap gap-2">
        {mySections.map((section) => (
          <li key={section} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700">
            {section}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BroadOverview() {
  const allSections = [...new Set(mockStudents.map((s) => s.classSection))].sort();
  const [sectionFilter, setSectionFilter] = useState<string>(allSections[0] ?? "");

  const filteredStudents = mockStudents.filter((s) => s.classSection === sectionFilter);

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">School-wide overview</h1>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total students" value={mockStudents.length} />
          <StatCard label="Total staff" value={mockTeachers.length - 1} />
          <StatCard label="Today's attendance %" value="—" />
        </div>
        <p className="text-sm text-slate-500">
          At-risk student alerts and staff punctuality will appear here once attendance data and
          the analytics endpoints exist.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Teachers</h2>
        <TeachersTable teachers={mockTeachers} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Students</h2>
          <select
            className="border border-slate-300 rounded-md px-2 py-1.5 text-sm"
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
          >
            {allSections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <StudentsTable students={filteredStudents} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-800 mt-1">{value}</div>
    </div>
  );
}
