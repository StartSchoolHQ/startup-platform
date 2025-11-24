"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function TestSupabasePage() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      console.log("Supabase client created");

      // Test simple query
      const { error } = await supabase.from("users").select("count").limit(1);

      if (error) {
        setResult(`Error: ${error.message}`);
      } else {
        setResult(`Success: Connected to Supabase`);
      }
    } catch (err) {
      setResult(`Exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setResult(`Auth Error: ${error.message}`);
      } else {
        setResult(
          `Auth Success: ${JSON.stringify(
            data.session?.user?.email || "No user"
          )}`
        );
      }
    } catch (err) {
      setResult(`Auth Exception: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Supabase Connection Test</h1>

      <div className="space-y-4">
        <Button onClick={testConnection} disabled={loading}>
          Test Database Connection
        </Button>

        <Button onClick={testAuth} disabled={loading}>
          Test Auth Connection
        </Button>

        {result && (
          <div className="p-4 bg-gray-100 rounded">
            <pre>{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
