import { createClient } from "@supabase/supabase-js";   

const supabaseUrl = 'https://nnmqgnqghavkzsktcilw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ubXFnbnFnaGF2a3pza3RjaWx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTI0ODQsImV4cCI6MjA2MTIyODQ4NH0.rIhWQSi4CRHJkZ7Mu575rRVU2RJFHgJRfzxdSU3cbDM';
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;