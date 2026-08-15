import type { Teacher } from "../types/domain";

export default function TeachersTable({ teachers }: { teachers: Teacher[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead className="bg-slate-50 text-slate-500 text-left">
          <tr>
            <th className="px-3 sm:px-4 py-2 font-medium whitespace-nowrap">ID</th>
            <th className="px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Name</th>
            <th className="px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Section</th>
            <th className="px-3 sm:px-4 py-2 font-medium whitespace-nowrap">Role</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {teachers.map((t) => (
            <tr key={t.id}>
              <td className="px-3 sm:px-4 py-2 text-slate-400 whitespace-nowrap">{t.id}</td>
              <td className="px-3 sm:px-4 py-2 text-slate-800 whitespace-nowrap">{t.fullName}</td>
              <td className="px-3 sm:px-4 py-2 text-slate-600 whitespace-nowrap">{t.classSection || "—"}</td>
              <td className="px-3 sm:px-4 py-2 text-slate-600 capitalize whitespace-nowrap">{t.role}</td>
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
