// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  onClose: vi.fn(),
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

  it("has a close control that reports back to the widget", () => {
    const onClose = vi.fn();
    render(<StartieChat {...base} onClose={onClose} />);
    screen.getByRole("button", { name: /close/i }).click();
    expect(onClose).toHaveBeenCalledTimes(1);
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
