# Save the key as base64 so Supabase won’t mess with quotes/newlines
supabase secrets set BQ_KEY_JSON=$(base64 -w0 giconnect-471219-212b8cb0b4b8.json)
