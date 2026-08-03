"use client";

// React Query hooks for the admin diplomas page.
// Key namespace: ["admin-diplomas", <slice>, ...params]

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  BatchRow,
  DiplomaReadiness,
  QwasarProgressRow,
  RpcDiplomaData,
} from "@/lib/diplomas/types";

const STALE_TIME = 5 * 60 * 1000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function postJson<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  return fetchJson<T>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export interface DiplomaStudentRow {
  id: string;
  name: string;
  email: string;
  qwasar_username: string | null;
  personal_code: string | null;
  startup_module_completed: boolean;
  team_name: string | null;
  issued_diploma: { diploma_number: string; issued_at: string } | null;
}

export interface IssuedDiplomaRow {
  id: string;
  diploma_number: string;
  diploma_type: "full" | "tech_only";
  issued_at: string;
  status: "issued" | "superseded";
  storage_path: string;
  users: { name: string; email: string } | null;
}

export interface DiplomaPreview {
  data: RpcDiplomaData;
  readiness: DiplomaReadiness;
  diploma_type: "full" | "tech_only";
}

export function useDiplomaStudents(active: boolean) {
  return useQuery({
    queryKey: ["admin-diplomas", "students"],
    queryFn: () =>
      fetchJson<DiplomaStudentRow[]>("/api/admin/diplomas/students"),
    staleTime: STALE_TIME,
    enabled: active,
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (input: {
      user_id: string;
      personal_code?: string | null;
      startup_module_completed?: boolean;
    }) => postJson("/api/admin/diplomas/students", input, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-diplomas", "students"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update student");
    },
  });
}

export function useBatches(active: boolean) {
  return useQuery({
    queryKey: ["admin-diplomas", "batches"],
    queryFn: () => fetchJson<BatchRow[]>("/api/admin/diplomas/batches"),
    staleTime: STALE_TIME,
    enabled: active,
  });
}

export function useUpsertBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (input: {
      id?: string;
      name: string;
      admission_date: string | null;
      completion_date: string | null;
      number_prefix: string;
    }) => postJson("/api/admin/diplomas/batches", input),
    onSuccess: () => {
      toast.success("Batch saved");
      queryClient.invalidateQueries({
        queryKey: ["admin-diplomas", "batches"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save batch");
    },
  });
}

export function useUploadQwasarProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (rows: QwasarProgressRow[]) =>
      postJson<{ upserted: number }>("/api/admin/diplomas/qwasar-progress", {
        rows,
      }),
    onSuccess: (result) => {
      toast.success(`${result.upserted} Qwasar progress rows upserted`);
      queryClient.invalidateQueries({ queryKey: ["admin-diplomas"] });
    },
    onError: (error) => {
      toast.error(error.message || "Qwasar progress upload failed");
    },
  });
}

export function useUploadUsernames() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (rows: { email: string; login: string }[]) =>
      postJson<{ matched: string[]; unmatched: string[] }>(
        "/api/admin/diplomas/qwasar-usernames",
        { rows }
      ),
    onSuccess: (result) => {
      toast.success(
        `${result.matched.length} usernames mapped, ${result.unmatched.length} unmatched`
      );
      queryClient.invalidateQueries({
        queryKey: ["admin-diplomas", "students"],
      });
    },
    onError: (error) => {
      toast.error(error.message || "Username mapping upload failed");
    },
  });
}

export function useDiplomaPreview(
  userId: string | null,
  batchId: string | null
) {
  return useQuery({
    queryKey: ["admin-diplomas", "preview", userId, batchId],
    queryFn: () =>
      fetchJson<DiplomaPreview>(
        `/api/admin/diplomas/preview?userId=${userId}&batchId=${batchId}`
      ),
    enabled: !!userId && !!batchId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useIssueDiploma() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (input: { user_id: string; batch_id: string }) =>
      postJson<{ diploma_number: string }>("/api/admin/diplomas/issue", input),
    onSuccess: (row) => {
      toast.success(`Issued ${row.diploma_number}`);
      queryClient.invalidateQueries({ queryKey: ["admin-diplomas"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to issue diploma");
    },
  });
}

export function useIssuedDiplomas(active: boolean) {
  return useQuery({
    queryKey: ["admin-diplomas", "issued"],
    queryFn: () => fetchJson<IssuedDiplomaRow[]>("/api/admin/diplomas/issued"),
    staleTime: STALE_TIME,
    enabled: active,
  });
}

export function useSupersedeDiploma() {
  const queryClient = useQueryClient();
  return useMutation({
    retry: 0,
    mutationFn: (id: string) =>
      postJson(`/api/admin/diplomas/${id}/supersede`, {}),
    onSuccess: () => {
      toast.success("Diploma superseded — you can now re-issue");
      queryClient.invalidateQueries({ queryKey: ["admin-diplomas"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to supersede diploma");
    },
  });
}

export async function openDiplomaDownload(id: string) {
  try {
    const { url } = await fetchJson<{ url: string }>(
      `/api/admin/diplomas/${id}/download`
    );
    window.open(url, "_blank");
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Failed to open download"
    );
  }
}
