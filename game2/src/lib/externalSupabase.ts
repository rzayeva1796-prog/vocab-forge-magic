import { createClient } from '@supabase/supabase-js';

// External Supabase connection for wordflow-mentor project
const EXTERNAL_SUPABASE_URL = 'https://qwqkrsvbmabodvmfktvj.supabase.co';
const EXTERNAL_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3cWtyc3ZibWFib2R2bWZrdHZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NjQ1NDYsImV4cCI6MjA4MDE0MDU0Nn0.JnGHMS4cWo6qdUW0K6RdSOaOQnou5K4BdWsZqEQpLKU';

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
