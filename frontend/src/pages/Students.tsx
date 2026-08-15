import { mockStudents } from "../mocks/data";
import StudentsTable from "../components/StudentsTable";

export default function Students() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Students</h1>
      <StudentsTable students={mockStudents} />
    </div>
  );
}
