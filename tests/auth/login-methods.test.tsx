// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LoginMethods } from "@/components/auth/login-methods";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("LoginMethods", () => {
  it("shows Google first and keeps the password form behind the email button", () => {
    render(<LoginMethods />);
    expect(screen.getByText("Continue with Google")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /sign in with email/i })
    ).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeNull();
  });

  it("opens the password form when the email button is clicked", () => {
    render(<LoginMethods />);
    fireEvent.click(
      screen.getByRole("button", { name: /sign in with email/i })
    );
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.getByLabelText("Password")).toBeTruthy();
  });
});
