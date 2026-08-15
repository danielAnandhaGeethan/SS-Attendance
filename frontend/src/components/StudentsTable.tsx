import type { Student } from "../types/domain";

export default function StudentsTable({ students }: { students: Student[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Section</th>
            <th className="px-4 py-2 font-medium">Contact</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {students.map((s) => (
            <tr key={s.id}>
              <td className="px-4 py-2 text-slate-400">{s.id}</td>
              <td className="px-4 py-2 text-slate-800">{s.fullName}</td>
              <td className="px-4 py-2 text-slate-600">{s.classSection}</td>
              <td className="px-4 py-2 text-slate-600">{s.contactNo}</td>
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No students.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
