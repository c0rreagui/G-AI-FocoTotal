import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wmuhtcgjcmvwjerxzjdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtdWh0Y2dqY212d2plcnh6amRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NjEwNDIsImV4cCI6MjA3ODQzNzA0Mn0.tGBe8iOz4YV5i5Gp_seLlkwISBXCO7h5fR-LRzNsAeU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
