"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight } from "lucide-react";
import { VerdictCard } from "./verdict-card";
import { VerdictTableRow } from "./verdict-row";
import type {
  TimelineRow,
  VerdictRow,
  VerdictStatus,
} from "@/types/program-assistant";

interface Props {
  verdicts: VerdictRow[];
  timeline: TimelineRow[];
}

const ALL = "all";
const FLAGGED: VerdictStatus[] = ["Talk to", "Watch"];
const QUIET: VerdictStatus[] = ["On pace", "Not tracked"];

function Section({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        {onToggle ? (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 px-2 text-base font-semibold"
            onClick={onToggle}
            aria-expanded={open}
          >
            {open ? (
              <ChevronDown className="mr-1 h-4 w-4" />
            ) : (
              <ChevronRight className="mr-1 h-4 w-4" />
            )}
            {title}
            <span className="text-muted-foreground ml-2 font-normal">
              {count}
            </span>
          </Button>
        ) : (
          <h3 className="text-base font-semibold">
            {title}
            <span className="text-muted-foreground ml-2 font-normal">
              {count}
            </span>
          </h3>
        )}
      </div>
      {open && children}
    </section>
  );
}

export function VerdictsTable({ verdicts, timeline }: Props) {
  const [track, setTrack] = useState(ALL);
  const [study, setStudy] = useState(ALL);
  const [search, setSearch] = useState("");
  const [openQuiet, setOpenQuiet] = useState<Record<string, boolean>>({});

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return verdicts.filter(
      (v) =>
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
  }, [verdicts, track, study, search]);

  const by = (s: VerdictStatus) => rows.filter((v) => v.status === s);
  const searching = search.trim() !== "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, login, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56"
        />
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
        {timeline.length > 0 && (
          <div className="text-muted-foreground ml-auto text-xs">
            {timeline.map((t) => (
              <div key={t.track}>
                <span className="text-foreground font-medium">
                  {t.track} wk {t.week}
                </span>
                : {t.requirement}
                {t.threshold_percent != null && (
                  <> · bar {t.threshold_percent}%</>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {FLAGGED.map((s) => {
        const list = by(s);
        if (list.length === 0) return null;
        return (
          <Section key={s} title={s} count={list.length} open>
            <div className="grid gap-3 md:grid-cols-2">
              {list.map((v) => (
                <VerdictCard key={v.qwasar_user_id} v={v} />
              ))}
            </div>
          </Section>
        );
      })}

      {QUIET.map((s) => {
        const list = by(s);
        if (list.length === 0) return null;
        const open = searching || !!openQuiet[s];
        return (
          <Section
            key={s}
            title={s}
            count={list.length}
            open={open}
            onToggle={() => setOpenQuiet((o) => ({ ...o, [s]: !o[s] }))}
          >
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Track</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>Attendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((v) => (
                    <VerdictTableRow key={v.qwasar_user_id} v={v} />
                  ))}
                </TableBody>
              </Table>
            </div>
          </Section>
        );
      })}

      {rows.length === 0 && (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No students match.
        </p>
      )}
    </div>
  );
}
