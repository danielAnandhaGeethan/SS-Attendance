from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
import os
from supabase import create_client
from attendance import AttendanceService

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SECRET_KEY")

if not url or not key:
    raise RuntimeError("Supabase URL or key is missing from .env")

supabase = create_client(url, key)
app = FastAPI(title="Supabase Tables API")
attendance_service = AttendanceService(supabase_client=supabase)


class LoginRequest(BaseModel):
    name: str


@app.post("/login")
def login_user(payload: LoginRequest):
    """Check teacher name by login and return valid/id response."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    result = attendance_service.login(payload.name)
    return result


@app.get("/teachers")
def list_teachers(limit: int = 100):
    try:
        return {"teachers": attendance_service.get_teachers(limit=limit)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/students")
def list_students(teacher_id: str | None = None, limit: int = 100):
    try:
        if teacher_id is None or teacher_id == "":
            rows = attendance_service.get_students(limit=limit)
            return {"students": rows}

        rows = attendance_service.get_students_for_user(teacher_id, limit=limit)
        if isinstance(rows, dict) and "teachers" in rows and "students" in rows:
            return rows
        return {"students": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/students/{teacher_id}")
def list_students_by_teacher_path(teacher_id: str, limit: int = 100):
    try:
        rows = attendance_service.get_students_for_user(teacher_id, limit=limit)
        if isinstance(rows, dict) and "teachers" in rows and "students" in rows:
            return rows
        return {"students": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
