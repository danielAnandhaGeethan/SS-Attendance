import os
from dotenv import load_dotenv
from supabase import create_client

# Load .env
load_dotenv()


class AttendanceService:
	"""Service for attendance-related DB access."""

	def __init__(self, supabase_client=None):
		# allow passing an existing supabase client (from main), otherwise create one
		if supabase_client:
			self.supabase = supabase_client
			return

		url = os.getenv("SUPABASE_URL")
		key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SECRET_KEY")

		if not url or not key:
			raise ValueError("Supabase URL or key is missing from .env")

		self.supabase = create_client(url, key)

	def get_teachers(self, limit: int = 100):
		"""Retrieve up to `limit` rows from the `teachers` table."""
		resp = self.supabase.table("teachers").select("*").limit(limit).execute()
		if hasattr(resp, "data"):
			return resp.data
		if isinstance(resp, dict) and "data" in resp:
			return resp["data"]
		return resp

	def get_students(self, limit: int = 100):
		"""Retrieve up to `limit` rows from the `students` table."""
		resp = self.supabase.table("students").select("*").limit(limit).execute()
		if hasattr(resp, "data"):
			return resp.data
		if isinstance(resp, dict) and "data" in resp:
			return resp["data"]
		return resp

	def get_students_by_teacher_id(self, teacher_id, limit: int = 100):
		"""Return students whose foreign-key `teacher_ids` matches the supplied teacher id."""
		teacher_id = str(teacher_id).strip()
		if not teacher_id:
			return []

		resp = self.supabase.table("students").select("*").eq("teacher_ids", teacher_id).limit(limit).execute()
		if hasattr(resp, "data"):
			return resp.data
		if isinstance(resp, dict) and "data" in resp:
			return resp["data"]
		return resp

	def get_students_for_user(self, user_id, limit: int = 100):
		"""If the user is a teacher, return only that teacher's students; otherwise return teacher rows + all students."""
		if user_id is None or str(user_id).strip() == "":
			return self.get_students(limit=limit)

		try:
			teachers = self.get_teachers(limit=1000)
		except Exception:
			return self.get_students(limit=limit)

		matched_teacher = None
		for teacher in teachers or []:
			if not isinstance(teacher, dict):
				continue
			if str(teacher.get("id")).strip() == str(user_id).strip():
				matched_teacher = teacher
				break

		if matched_teacher is None:
			return self.get_students(limit=limit)

		if str(matched_teacher.get("role", "")).strip().lower() == "teacher":
			return {
				"teachers": [],
				"students": self.get_students_by_teacher_id(user_id, limit=limit),
			}

		teacher_rows = [
			row for row in (teachers or [])
			if isinstance(row, dict)
			and str(row.get("role", "")).strip().lower() != "superintendent"
			and str(row.get("id", "")).strip() != str(matched_teacher.get("id", "")).strip()
		]
		return {
			"teachers": teacher_rows,
			"students": self.get_students(limit=limit),
		}

	def login(self, name: str):
		"""Check teacher name and return valid/id response."""
		if not name or not str(name).strip():
			return {"success": False, "data": {"valid": False, "id": None}}

		clean_name = str(name).strip()
		try:
			teachers = self.get_teachers(limit=1000)
		except Exception:
			return {"success": False, "data": {"valid": False, "id": None}}

		for teacher in teachers or []:
			if not isinstance(teacher, dict):
				continue
			for field in ("full_name", "name", "teacher_name", "teacher"):
				if str(teacher.get(field, "")).strip().lower() == clean_name.lower():
					return {"success": True, "data": {"valid": True, "id": teacher.get("id")}}

		return {"success": True, "data": {"valid": False, "id": None}}


if __name__ == "__main__":
	svc = AttendanceService()
	print("Login:", svc.login("nelson"))
	print("Students by teacher:", svc.get_students_by_teacher_id("T004"))

