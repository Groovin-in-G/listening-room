// Public settings. The anon key is a PUBLIC key by design (it is already in the voting pages);
// what it can reach is decided by the row-level security in ../setup/*.sql, not by hiding it.
export const SUPABASE_URL = 'https://gcgsqhgydoojrgkliiwn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ3NxaGd5ZG9vanJna2xpaXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mzk1ODUsImV4cCI6MjA5NzExNTU4NX0.6ecU6Ehz0vEA3ggKJYZjGQHasEJzXAUQiwSF1UBofDk';
export const BUCKET = 'listening-room';
// Where the room lives in public (George 2026-10-21: moved from Netlify to GitHub Pages). Links the room hands out
// (invites, the address form) are built from this, so a copy made inside the Grooving Biz back office, where the
// page is shown through the back office's own private address, still opens for an artist.
export const PUBLIC_URL = 'https://bluedawnrecords.github.io/listening-room/';   // label's own org since 21 Oct
