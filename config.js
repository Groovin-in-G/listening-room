// Public settings. The anon key is a PUBLIC key by design (it is already in the voting pages);
// what it can reach is decided by the row-level security in ../setup/*.sql, not by hiding it.
export const SUPABASE_URL = 'https://gcgsqhgydoojrgkliiwn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ3NxaGd5ZG9vanJna2xpaXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1Mzk1ODUsImV4cCI6MjA5NzExNTU4NX0.6ecU6Ehz0vEA3ggKJYZjGQHasEJzXAUQiwSF1UBofDk';
export const BUCKET = 'listening-room';
