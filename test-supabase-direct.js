import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ksoohvygoysofvtqdumz.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzb29odnlnb3lzb2Z2dHFkdW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjUxMDQsImV4cCI6MjA3MzYwMTEwNH0.NjEkPXAfeaD6ZHnvTZIRuNwHMtFaq1oGROGoE-rk6kk";

const supabase = createClient(supabaseUrl, supabaseKey);

// Test basic connection
console.log("Testing Supabase connection...");
try {
  const { data, error } = await supabase.auth.getSession();
  console.log("Connection test result:", { data, error });
} catch (err) {
  console.error("Connection failed:", err);
}
