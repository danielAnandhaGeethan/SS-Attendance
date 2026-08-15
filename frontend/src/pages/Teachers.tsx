import { mockTeachers } from "../mocks/data";
import TeachersTable from "../components/TeachersTable";

export default function Teachers() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-800">Teachers</h1>
      <TeachersTable teachers={mockTeachers} />
    </div>
  );
}
