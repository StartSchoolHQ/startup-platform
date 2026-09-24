"use client";

import Image from "next/image";
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
        "bg-background hover:bg-muted fixed right-4 bottom-4 z-40 flex size-12",
        "items-center justify-center rounded-full border shadow-lg transition",
        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
      )}
    >
      <Image
        src="/startie.png"
        alt=""
        width={36}
        height={36}
        className="pointer-events-none"
        style={{ imageRendering: "pixelated" }}
      />
      {unread && (
        <span className="bg-primary absolute -top-0.5 -right-0.5 size-3 rounded-full ring-2 ring-white dark:ring-neutral-900" />
      )}
    </button>
  );
}
