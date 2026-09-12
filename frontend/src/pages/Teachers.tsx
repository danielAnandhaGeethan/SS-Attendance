import { useTeachers } from "../api/hooks";
import TeachersTable from "../components/TeachersTable";

export default function Teachers() {
  const { data: teachers, loading, error } = useTeachers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Teachers</h1>
      {loading && <p className="text-sm text-slate-500">Loading teachers…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && !error && <TeachersTable teachers={teachers} />}
    </div>
  );
}
