"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictTableRow } from "./verdict-row";
import type { TimelineRow, VerdictRow } from "@/types/program-assistant";

interface Props {
  verdicts: VerdictRow[];
  timeline: TimelineRow[];
}

const ALL = "all";

export function VerdictsTable({ verdicts, timeline }: Props) {
  const [status, setStatus] = useState(ALL);
  const [track, setTrack] = useState(ALL);
  const [study, setStudy] = useState(ALL);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return verdicts.filter(
      (v) =>
        (status === ALL || v.status === status) &&
        (track === ALL || (v.track ?? "FS") === track) &&
        (study === ALL ||
          (study === "part-time"
            ? (v.study_type ?? "").startsWith("part-time")
            : !(v.study_type ?? "").startsWith("part-time"))) &&
        (q === "" ||
          (v.name ?? "").toLowerCase().includes(q) ||
          (v.login ?? "").toLowerCase().includes(q) ||
          (v.email ?? "").toLowerCase().includes(q))
    );
  }, [verdicts, status, track, study, search]);

  return (
    <div className="space-y-3">
      {timeline.length > 0 && (
        <div className="text-muted-foreground grid gap-1 text-xs sm:grid-cols-3">
          {timeline.map((t) => (
            <div key={t.track}>
              <span className="text-foreground font-medium">
                {t.track} week {t.week}
              </span>{" "}
              · {t.requirement}
              {t.threshold_percent != null && (
                <>
                  {" "}
                  · bar {t.threshold_module} ≥ {t.threshold_percent}%
                </>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name, login, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="Talk to">Talk to</SelectItem>
            <SelectItem value="Watch">Watch</SelectItem>
            <SelectItem value="On pace">On pace</SelectItem>
            <SelectItem value="Not tracked">Not tracked</SelectItem>
          </SelectContent>
        </Select>
        <Select value={track} onValueChange={setTrack}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All tracks</SelectItem>
            <SelectItem value="FS">FS</SelectItem>
            <SelectItem value="ML">ML</SelectItem>
          </SelectContent>
        </Select>
        <Select value={study} onValueChange={setStudy}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All study types</SelectItem>
            <SelectItem value="full-time">Full-time</SelectItem>
            <SelectItem value="part-time">Part-time</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-muted-foreground self-center text-sm">
          {rows.length} of {verdicts.length}
        </span>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead>Last login</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Why · next step</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-8 text-center"
                >
                  No students match.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((v) => <VerdictTableRow key={v.qwasar_user_id} v={v} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
