import { useStudents } from "../api/hooks";
import StudentsTable from "../components/StudentsTable";

export default function Students() {
  const { data: students, loading, error } = useStudents();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Students</h1>
      {loading && <p className="text-sm text-slate-500">Loading students…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && !error && <StudentsTable students={students} />}
    </div>
  );
}
