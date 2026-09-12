import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Teacher } from "../types/domain";

export default function Login() {
  const { currentUser, teachersLoading, teachersError, findMatches, login } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<Teacher[] | null>(null);

  useEffect(() => {
    if (currentUser) navigate("/", { replace: true });
  }, [currentUser, navigate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (teachersLoading) {
      setError("Still loading, please try again in a moment.");
      return;
    }
    if (teachersError) {
      setError("Couldn't reach the server. Please try again later.");
      return;
    }

    const found = findMatches(name);
    if (found.length === 0) {
      setError("No one with that name was found. Check the spelling and try again.");
      return;
    }
    if (found.length === 1) {
      login(found[0].id);
      navigate("/");
      return;
    }
    // More than one match - ask which section they belong to.
    setMatches(found);
  }

  function chooseMatch(teacherId: string) {
    login(teacherId);
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-800">Sunday School Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with your name to continue</p>
        </div>

        {matches ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              More than one person is named <span className="font-medium">"{name.trim()}"</span>.
              Which section do you belong to?
            </p>
            <div className="space-y-2">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => chooseMatch(m.id)}
                  className="w-full text-left px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 text-sm"
                >
                  <span className="font-medium text-slate-800">{m.classSection || "—"}</span>
                  <span className="text-slate-400"> · {m.role}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMatches(null)}
              className="text-sm text-slate-400 hover:text-slate-600"
            >
              ← Back
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
