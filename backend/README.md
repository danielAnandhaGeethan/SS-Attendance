# Supabase Tables API (FastAPI)

Simple FastAPI app that exposes a `/tables` endpoint which returns table names in the `public` schema of your Supabase database. It reads `SUPABASE_URL` and `SUPABASE_KEY` (or `SUPABASE_SECRET_KEY`) from `.env`.

Run locally:

```bash
python -m pip install -r requirements.txt
python main.py
# or run the test script
python run_test.py
```
