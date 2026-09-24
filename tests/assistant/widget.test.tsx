// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StartieChat } from "@/components/assistant/startie-chat";

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

  it("shows unlimited for admins", () => {
    render(<StartieChat {...base} isAdmin remaining={null} />);
    expect(screen.getByText("unlimited")).toBeTruthy();
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
});
