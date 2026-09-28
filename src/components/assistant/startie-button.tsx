"use client";

import Image from "next/image";
import { STARTIE_ICON_SRC } from "@/lib/assistant/icon";
import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
  unread: boolean;
}

/** The collapsed widget: Startie's face, bottom-right, with an unread dot. */
export function StartieButton({ onClick, unread }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Startie, the AI assistant"
      className={cn(
        "bg-background hover:bg-muted fixed right-4 bottom-4 z-40 flex size-14",
        "items-center justify-center rounded-full border shadow-lg transition",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        // Pops back in when the panel minimizes into this corner.
        "animate-in fade-in-0 zoom-in-75 duration-150 motion-reduce:animate-none"
      )}
    >
      <Image
        src={STARTIE_ICON_SRC}
        alt=""
        width={42}
        height={42}
        className="pointer-events-none"
        style={{ imageRendering: "pixelated" }}
      />
      {unread && (
        <span className="bg-primary absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-neutral-900" />
      )}
    </button>
  );
}
