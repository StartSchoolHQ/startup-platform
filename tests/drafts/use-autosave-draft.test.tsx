// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import {
  useAutosaveDraft,
  type UseAutosaveDraftOptions,
} from "@/hooks/use-autosave-draft";
import { DraftSaveState } from "@/components/forms/draft-save-state";

type Props = UseAutosaveDraftOptions<string>;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function setup(overrides: Partial<Props> = {}) {
  const save = vi.fn<(v: string) => Promise<void>>().mockResolvedValue();
  const beacon = vi.fn<(v: string) => void>();
  const initialProps: Props = {
    enabled: true,
    value: "a",
    canSave: () => true,
    save,
    beacon,
    ...overrides,
  };
  const hook = renderHook((props: Props) => useAutosaveDraft(props), {
    initialProps,
  });
  const change = (value: string, extra: Partial<Props> = {}) =>
    hook.rerender({ ...initialProps, ...extra, value });
  return { ...hook, save, beacon, change, initialProps };
}

const tick = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setVisibility("visible");
});

describe("useAutosaveDraft", () => {
  it("value changes while enabled mark dirty and (re)start the timer", async () => {
    const { change, save } = setup();
    await tick(5000);
    expect(save).not.toHaveBeenCalled();

    change("b");
    await tick(1500);
    change("c");
    await tick(1500);
    expect(save).not.toHaveBeenCalled();

    await tick(500);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
  });

  it("a change while a save is in flight queues exactly one more save after it settles", async () => {
    const first = deferred();
    const { change, save } = setup();
    save.mockReturnValueOnce(first.promise);

    change("b");
    await tick(2000);
    expect(save).toHaveBeenCalledTimes(1);

    change("c");
    change("d");
    await tick(2000);
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      first.resolve();
      await first.promise;
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("d");

    await tick(5000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("flush() cancels the timer and saves the latest value if dirty", async () => {
    const { change, save, result } = setup();
    await act(() => result.current.flush());
    expect(save).not.toHaveBeenCalled();

    change("b");
    await tick(500);
    await act(() => result.current.flush());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("b");

    await tick(5000);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("cancel() drops dirty and no save follows", async () => {
    const { change, save, beacon, result } = setup();
    change("b");
    act(() => result.current.cancel());
    await tick(5000);
    await act(() => result.current.flush());
    window.dispatchEvent(new Event("pagehide"));
    expect(save).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("enabled: false → nothing is ever saved", async () => {
    const { change, save, beacon, result, unmount } = setup({
      enabled: false,
    });
    change("b", { enabled: false });
    change("c", { enabled: false });
    await tick(5000);
    await act(() => result.current.flush());
    window.dispatchEvent(new Event("pagehide"));
    unmount();
    expect(save).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("pagehide and visibilitychange (hidden) while dirty call beacon once with the latest value and clear dirty", async () => {
    const { change, save, beacon } = setup();
    change("b");
    window.dispatchEvent(new Event("pagehide"));
    window.dispatchEvent(new Event("pagehide"));
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledWith("b");
    await tick(5000);
    expect(save).not.toHaveBeenCalled();

    change("c");
    setVisibility("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(beacon).toHaveBeenCalledTimes(1);

    setVisibility("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(beacon).toHaveBeenCalledTimes(2);
    expect(beacon).toHaveBeenLastCalledWith("c");
  });

  it("disabling while dirty fires beacon once, then resets so nothing carries over", async () => {
    const { change, save, beacon, result } = setup();
    change("b");
    await tick(1000);
    change("c");
    change("c", { enabled: false });
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledWith("c");

    await tick(5000);
    expect(save).not.toHaveBeenCalled();

    change("c");
    await act(() => result.current.flush());
    await tick(5000);
    expect(save).not.toHaveBeenCalled();
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it("disabling without a beacon still drops the dirty flag", async () => {
    const { change, save, result } = setup({ beacon: undefined });
    change("b");
    change("b", { enabled: false });
    change("b");
    await act(() => result.current.flush());
    await tick(5000);
    expect(save).not.toHaveBeenCalled();
  });

  it("unmount while dirty calls beacon", () => {
    const { change, beacon, unmount } = setup();
    change("b");
    unmount();
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledWith("b");
  });

  it("status goes saving → saved → idle after 3000 ms", async () => {
    const pending = deferred();
    const { change, save, result } = setup();
    save.mockReturnValueOnce(pending.promise);
    expect(result.current.status).toBe("idle");

    change("b");
    await tick(2000);
    expect(result.current.status).toBe("saving");

    await act(async () => {
      pending.resolve();
      await pending.promise;
    });
    expect(result.current.status).toBe("saved");
    expect(result.current.savedAt).toBeInstanceOf(Date);

    await tick(2999);
    expect(result.current.status).toBe("saved");
    await tick(1);
    expect(result.current.status).toBe("idle");
  });

  it("a rejected save sets error with the error's message", async () => {
    const { change, save, result } = setup();
    save.mockRejectedValueOnce(new Error("Network down"));
    change("b");
    await tick(2000);
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("Network down");

    await tick(5000);
    expect(result.current.status).toBe("error");

    change("c");
    await tick(2000);
    expect(result.current.status).toBe("saved");
    expect(result.current.errorMessage).toBeNull();
  });

  it("disabling after a failed save resets the indicator for the next open", async () => {
    const { change, save, result } = setup();
    save.mockRejectedValueOnce(new Error("Network down"));
    change("b");
    await tick(2000);
    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toBe("Network down");

    change("b", { enabled: false });
    change("b", { enabled: true });
    expect(result.current.status).toBe("idle");
    expect(result.current.errorMessage).toBeNull();
  });
});

describe("DraftSaveState", () => {
  it("keeps an empty live region mounted when idle", () => {
    const { container } = render(<DraftSaveState status="idle" />);
    const region = container.querySelector("[aria-live='polite']");
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe("");
  });

  it("shows saving, saved, and the error fallback", () => {
    const { rerender } = render(<DraftSaveState status="saving" />);
    expect(screen.getByText("Saving…")).toBeTruthy();

    rerender(<DraftSaveState status="saved" />);
    expect(screen.getByText("Saved")).toBeTruthy();

    rerender(<DraftSaveState status="error" errorMessage="Network down" />);
    expect(screen.getByText("Network down")).toBeTruthy();

    rerender(<DraftSaveState status="error" />);
    expect(screen.getByText("Not saved, check your connection")).toBeTruthy();
    expect(screen.getByText(/Not saved/).getAttribute("aria-live")).toBe(
      "polite"
    );
  });
});
