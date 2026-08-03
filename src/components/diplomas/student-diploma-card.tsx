"use client";

import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MineResponse {
  diploma: { diploma_number: string; issued_at: string } | null;
  url?: string;
}

export function StudentDiplomaCard({ userId }: { userId: string | undefined }) {
  const { data } = useQuery({
    queryKey: ["diplomas", "mine", userId],
    queryFn: async (): Promise<MineResponse> => {
      const res = await fetch("/api/diplomas/mine");
      if (!res.ok) throw new Error("Failed to load diploma");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  if (!data?.diploma) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Diploma
        </CardTitle>
        <CardDescription>
          Supplement to Diploma {data.diploma.diploma_number}, issued{" "}
          {new Date(data.diploma.issued_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="outline"
          onClick={() => data.url && window.open(data.url, "_blank")}
        >
          Download PDF
        </Button>
      </CardContent>
    </Card>
  );
}
