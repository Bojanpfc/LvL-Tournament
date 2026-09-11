// Shared Supabase client, used by every page. Requires config.js to be
// loaded first, and the Supabase JS library <script> tag before this one.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
