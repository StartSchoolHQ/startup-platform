// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StartieChat } from "@/components/assistant/startie-chat";

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
// jsdom has neither; the scroller uses both for anchoring and visibility.
(globalThis as Record<string, unknown>).ResizeObserver ??= NoopObserver;
(globalThis as Record<string, unknown>).IntersectionObserver ??= NoopObserver;

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

const base = {
  messages: [],
  threads: [],
  threadId: null,
  remaining: 25,
  dailyLimit: 25,
  isAdmin: false,
  streaming: false,
  banner: null,
  onSend: vi.fn(),
  onFlag: vi.fn(),
  onSelectThread: vi.fn(),
  onNewThread: vi.fn(),
  onMinimize: vi.fn(),
  draft: "",
  onDraftChange: vi.fn(),
};

describe("StartieChat", () => {
  it("shows the AI disclosure on a new thread", () => {
    render(<StartieChat {...base} />);
    expect(screen.getByText(/I'm an AI\./)).toBeTruthy();
    expect(screen.getByText(/Admins can read these chats/)).toBeTruthy();
    expect(screen.getByText("25 of 25 left today")).toBeTruthy();
  });

  it("disables the composer and names the reset time at zero remaining", () => {
    render(<StartieChat {...base} remaining={0} />);
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(box.disabled).toBe(true);
    expect(box.placeholder).toMatch(/resets at 00:00 UTC/);
  });

  it("tells admins they have no daily limit", () => {
    render(<StartieChat {...base} isAdmin remaining={null} />);
    expect(screen.getByText("No daily limit (admin)")).toBeTruthy();
  });

  it("renders assistant markdown and a flag button per reply", () => {
    render(
      <StartieChat
        {...base}
        messages={[
          { id: "1", role: "user", content: "hi" },
          { id: "2", role: "assistant", content: "**Bold** move." },
        ]}
      />
    );
    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(
      screen.getAllByRole("button", { name: /not helpful/i })
    ).toHaveLength(1);
  });

  it("shows a flagged reply as already flagged and disables the button", () => {
    const onFlag = vi.fn();
    render(
      <StartieChat
        {...base}
        onFlag={onFlag}
        messages={[
          { id: "1", role: "user", content: "hi" },
          { id: "2", role: "assistant", content: "meh", flagged: true },
          { id: "3", role: "assistant", content: "ok" },
        ]}
      />
    );
    const flagged = screen.getByRole("button", {
      name: /flagged for an admin/i,
    }) as HTMLButtonElement;
    expect(flagged.disabled).toBe(true);
    flagged.click();
    expect(onFlag).not.toHaveBeenCalled();
    expect(
      screen.getAllByRole("button", { name: /^not helpful/i })
    ).toHaveLength(1);
  });

  it("has a minimize control, not a close, that reports back to the widget", () => {
    const onMinimize = vi.fn();
    render(<StartieChat {...base} onMinimize={onMinimize} />);
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
    screen.getByRole("button", { name: /minimize/i }).click();
    expect(onMinimize).toHaveBeenCalledTimes(1);
  });

  it("renders the draft the widget owns and reports edits upward", () => {
    const onDraftChange = vi.fn();
    render(
      <StartieChat {...base} draft="kept text" onDraftChange={onDraftChange} />
    );
    const box = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(box.value).toBe("kept text");
    fireEvent.change(box, { target: { value: "kept text more" } });
    expect(onDraftChange).toHaveBeenCalledWith("kept text more");
  });

  it("clears the draft after sending", () => {
    const onSend = vi.fn();
    const onDraftChange = vi.fn();
    render(
      <StartieChat
        {...base}
        draft="  send me  "
        onSend={onSend}
        onDraftChange={onDraftChange}
      />
    );
    screen.getByRole("button", { name: /send/i }).click();
    expect(onSend).toHaveBeenCalledWith("send me");
    expect(onDraftChange).toHaveBeenCalledWith("");
  });

  it("renders the transcript inside a MessageScroller viewport", () => {
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: `message ${i}`,
    }));
    const { container } = render(<StartieChat {...base} messages={many} />);
    const viewport = container.querySelector(
      '[data-slot="message-scroller-viewport"]'
    );
    expect(viewport).not.toBeNull();
    expect(
      container.querySelectorAll('[data-slot="message-scroller-item"]').length
    ).toBe(41); // 40 turns + the disclosure marker
  });
});
