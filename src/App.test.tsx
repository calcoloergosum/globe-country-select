// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  addColorStop: vi.fn(),
  clearRect: vi.fn(),
  createRadialGradient: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  resizeObserverInstances: [] as Array<{
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  }>
}));

vi.mock("./pages/MainPage", () => ({
  MainPage: ({ onNavigate }: { onNavigate: (page: "main" | "quiz") => void }) => (
    <div>
      <p>Main page</p>
      <button type="button" onClick={() => onNavigate("quiz")}>to-quiz</button>
    </div>
  )
}));

vi.mock("./pages/QuizPage", () => ({
  QuizPage: ({ onNavigate }: { onNavigate: (page: "main" | "quiz") => void }) => (
    <div>
      <p>Quiz page</p>
      <button type="button" onClick={() => onNavigate("main")}>to-main</button>
    </div>
  )
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    mockState.addColorStop.mockReset();
    mockState.clearRect.mockReset();
    mockState.createRadialGradient.mockReset();
    mockState.fillRect.mockReset();
    mockState.beginPath.mockReset();
    mockState.arc.mockReset();
    mockState.fill.mockReset();
    mockState.resizeObserverInstances.length = 0;

    mockState.createRadialGradient.mockReturnValue({
      addColorStop: mockState.addColorStop
    });

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
      ({
        clearRect: mockState.clearRect,
        createRadialGradient: mockState.createRadialGradient,
        fillRect: mockState.fillRect,
        beginPath: mockState.beginPath,
        arc: mockState.arc,
        fill: mockState.fill,
        fillStyle: ""
      }) as unknown as CanvasRenderingContext2D
    );

    Object.defineProperty(HTMLCanvasElement.prototype, "offsetWidth", {
      configurable: true,
      get: () => 300
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => 200
    });

    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe = vi.fn();
        disconnect = vi.fn();
        callback: ResizeObserverCallback;

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
          mockState.resizeObserverInstances.push(this);
        }
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("switches between main and quiz pages via navigation callbacks", () => {
    const { container } = render(<App />);

    expect(screen.queryByText("Main page")).not.toBeNull();
    expect(container.querySelector("canvas")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "to-quiz" }));
    expect(screen.queryByText("Quiz page")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "to-main" }));
    expect(screen.queryByText("Main page")).not.toBeNull();
  });

  it("draws the starfield and redraws on ResizeObserver callback", () => {
    const { container, unmount } = render(<App />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;

    expect(canvas).not.toBeNull();
    expect(canvas.width).toBe(300);
    expect(canvas.height).toBe(200);
    expect(mockState.clearRect).toHaveBeenCalledWith(0, 0, 300, 200);
    expect(mockState.createRadialGradient).toHaveBeenCalledTimes(1);
    expect(mockState.addColorStop).toHaveBeenCalledTimes(3);
    expect(mockState.fillRect).toHaveBeenCalledWith(0, 0, 300, 200);
    expect(mockState.arc).toHaveBeenCalledTimes(600);

    const observer = mockState.resizeObserverInstances[0];
    observer.callback([] as unknown as ResizeObserverEntry[], observer as unknown as ResizeObserver);
    expect(mockState.clearRect).toHaveBeenCalledTimes(2);
    expect(mockState.arc).toHaveBeenCalledTimes(1200);

    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });
});
