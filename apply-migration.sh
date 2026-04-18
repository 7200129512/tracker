#!/bin/bash

# Read the migration SQL file
MIGRATION_SQL=$(cat backend/src/db/migrations/003_add_user_id_columns.sql)

# Execute each SQL statement
echo "Applying migration to Supabase..."

# Add user_id to income_entries
echo "Adding user_id to income_entries..."
curl -X POST "https://zcoildagsacuaceohddal.supabase.co/rest/v1/rpc/exec_sql" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpjb2lsZGFnc2FjdWFjZW9oZGRhbCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzEyNDEwNDAwLCJleHAiOjE4NzAwMTg0MDB9.zcoIdwsacuacohddal_238595cHdleit-i1i" \
  -H "Content-Type: application/json" \
  -d '{"sql":"ALTER TABLE income_entries ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;"}'

echo "Done!"
