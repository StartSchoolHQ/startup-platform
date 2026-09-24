"use client";

import { useAttention, usePulse } from "../use-analytics";
import { AttentionList } from "./attention-list";
import { PulseCards } from "./pulse-cards";
import { WhatMoved } from "./what-moved";

interface Props {
  active: boolean;
  batchId: string | null;
}

/** Default analytics tab: four pulse numbers, the attention list, what moved. */
export function ThisWeekTab({ active, batchId }: Props) {
  const pulse = usePulse(batchId, active);
  const attention = useAttention(batchId, active);

  return (
    <div className="space-y-4">
      <PulseCards pulse={pulse.data} isLoading={pulse.isLoading} />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <AttentionList
          rows={attention.data}
          isLoading={attention.isLoading}
          isError={attention.isError}
        />
        <WhatMoved items={pulse.data?.what_moved} />
      </div>
    </div>
  );
}
