import { useEffect, useState } from "react";
import type { Student, Teacher } from "../types/domain";
import { fetchStudents, fetchTeachers } from "./client";

interface FetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function useTeachers(): FetchState<Teacher[]> {
  const [state, setState] = useState<FetchState<Teacher[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchTeachers()
      .then((teachers) => {
        if (!cancelled) setState({ data: teachers, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: [], loading: false, error: err instanceof Error ? err.message : "Failed to load teachers" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useStudents(): FetchState<Student[]> {
  const [state, setState] = useState<FetchState<Student[]>>({ data: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    fetchStudents()
      .then((students) => {
        if (!cancelled) setState({ data: students, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ data: [], loading: false, error: err instanceof Error ? err.message : "Failed to load students" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
