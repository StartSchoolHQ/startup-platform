"use client";

import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

export default function TestPostHogPage() {
  const testEvent = () => {
    console.log("PostHog instance:", posthog);
    console.log("Is PostHog initialized?", posthog.__loaded);
    
    posthog.capture("test_button_clicked", {
      timestamp: new Date().toISOString(),
      test: true,
    });
    
    alert("Test event sent! Check console and PostHog dashboard.");
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">PostHog Test Page</h1>
      <div className="space-y-4">
        <p>Click the button to send a test event to PostHog.</p>
        <Button onClick={testEvent}>Send Test Event</Button>
        <div className="mt-4 p-4 bg-muted rounded">
          <p className="font-mono text-sm">
            Open browser console (F12) to see PostHog debug info.
          </p>
        </div>
      </div>
    </div>
  );
}
