"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];
type EventRow =
  Database["public"]["Tables"]["scholarship_agreement_events"]["Row"];

interface DetailPayload {
  agreement: Row;
  events: EventRow[];
}

interface AgreementDetailModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  /** Id of the agreement to load; null when the modal is closed. */
  agreementId: string | null;
  /** Fired whenever a mutation succeeds so the parent list can refresh. */
  onChanged: () => void;
}

const TERMINAL_STATUSES: Row["status"][] = ["archived", "cancelled"];

/**
 * Admin detail modal:
 *   - GETs /api/agreements/admin/:id on open
 *   - Subscribes to postgres_changes on the row + its events via Supabase
 *     Realtime so admin sees postback-driven status updates without F5.
 *   - Exposes Sign-as-school / Retry / Download / Cancel actions
 *     depending on current status.
 */
export function AgreementDetailModal({
  open,
  onOpenChange,
  agreementId,
  onChanged,
}: AgreementDetailModalProps) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!agreementId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agreements/admin/${agreementId}`);
      if (!res.ok) {
        toast.error("Failed to load agreement detail");
        return;
      }
      const json = (await res.json()) as { data: DetailPayload };
      setData(json.data);
    } finally {
      setLoading(false);
    }
  }, [agreementId]);

  useEffect(() => {
    if (open && agreementId) reload();
    if (!open) setData(null);
  }, [open, agreementId, reload]);

  useEffect(() => {
    if (!open || !agreementId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`scholarship-agreement-${agreementId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scholarship_agreements",
          filter: `id=eq.${agreementId}`,
        },
        () => {
          reload();
          onChanged();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scholarship_agreement_events",
          filter: `agreement_id=eq.${agreementId}`,
        },
        () => reload()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, agreementId, reload, onChanged]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data?.agreement.recipient_email ?? "Loading…"}
          </DialogTitle>
        </DialogHeader>
        {loading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : data ? (
          <DetailBody
            data={data}
            onChanged={onChanged}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface DetailBodyProps {
  data: DetailPayload;
  onChanged: () => void;
  onClose: () => void;
}

function DetailBody({ data, onChanged, onClose }: DetailBodyProps) {
  const { agreement, events } = data;

  async function cancel() {
    const reason = window.prompt("Cancellation reason?");
    if (!reason || !reason.trim()) return;
    const res = await fetch(`/api/agreements/admin/${agreement.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: reason.trim() }),
    });
    if (!res.ok) {
      toast.error("Cancel failed");
      return;
    }
    toast.success("Cancelled");
    onChanged();
    onClose();
  }

  async function retry() {
    const res = await fetch(`/api/agreements/admin/${agreement.id}/retry`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Retry failed");
      return;
    }
    toast.success("Re-created PDF + signing session");
    onChanged();
  }

  async function download() {
    const res = await fetch(`/api/agreements/admin/${agreement.id}/download`);
    if (!res.ok) {
      toast.error("Download failed");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function signSingle() {
    const res = await fetch(
      `/api/agreements/admin/${agreement.id}/sign-single`
    );
    if (!res.ok) {
      toast.error("Could not open signing URL");
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const retryable =
    agreement.status === "identity_verified" || agreement.status === "failed";
  const downloadable = agreement.status === "archived";
  const schoolSignable = agreement.status === "awaiting_school_signature";
  const cancellable = !TERMINAL_STATUSES.includes(agreement.status);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={agreement.status} />
        <span className="text-sm text-zinc-600 capitalize">
          {agreement.agreement_type} scholarship
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Field label="Phone" value={agreement.recipient_phone} />
        <Field label="Email" value={agreement.recipient_email} />
        <Field
          label="Address"
          value={agreement.recipient_address}
          className="sm:col-span-2"
        />
        {agreement.signer_name && (
          <Field
            label="Signer"
            value={`${agreement.signer_name} ${agreement.signer_surname ?? ""} (${agreement.signer_personal_code ?? ""})`}
            className="sm:col-span-2"
          />
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        {schoolSignable && (
          <Button size="sm" onClick={signSingle}>
            Sign as school
          </Button>
        )}
        {retryable && (
          <Button size="sm" variant="outline" onClick={retry}>
            Retry PDF + signing
          </Button>
        )}
        {downloadable && (
          <Button size="sm" variant="outline" onClick={download}>
            Download signed .edoc
          </Button>
        )}
        {cancellable && (
          <Button size="sm" variant="destructive" onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Event timeline</h3>
        <ul className="space-y-1 text-sm">
          {events.map((event) => (
            <li key={event.id} className="flex justify-between gap-3">
              <span className="text-zinc-700">
                {event.event_type.replaceAll("_", " ")}
              </span>
              <span className="shrink-0 text-zinc-500 tabular-nums">
                {new Date(event.occurred_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs tracking-wide text-zinc-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-zinc-900">{value}</dd>
    </div>
  );
}
