import type { Teacher } from "../types/domain";

export default function TeachersTable({ teachers }: { teachers: Teacher[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Section</th>
            <th className="px-4 py-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {teachers.map((t) => (
            <tr key={t.id}>
              <td className="px-4 py-2 text-slate-400">{t.id}</td>
              <td className="px-4 py-2 text-slate-800">{t.fullName}</td>
              <td className="px-4 py-2 text-slate-600">{t.classSection || "—"}</td>
              <td className="px-4 py-2 text-slate-600 capitalize">{t.role}</td>
            </tr>
          ))}
          {teachers.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                No staff.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
