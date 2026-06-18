// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  interactiveGlobeProps: null as null | {
    countries: unknown[];
    globeImageUrl?: string;
    onPointHover?: (point: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void;
    onPointClick?: (point: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void;
  },
  parseCountriesGeoJsonRaw: vi.fn(() => [
    {
      type: "Feature",
      properties: { ADMIN: "France", ISO_A2: "FR" },
      geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
    }
  ])
}));

vi.mock("../components/InteractiveGlobe", () => ({
  InteractiveGlobe: (props: {
    countries: unknown[];
    globeImageUrl?: string;
    onPointHover?: (point: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void;
    onPointClick?: (point: { lat: number; lng: number; label: string; isoAlpha2?: string } | null) => void;
  }) => {
    mockState.interactiveGlobeProps = props;
    return (
      <div>
        <button
          type="button"
          onClick={() =>
            props.onPointHover?.({ lat: 48.8, lng: 2.3, label: "France (FR)", isoAlpha2: "FR" })
          }
        >
          emit-hover
        </button>
        <button
          type="button"
          onClick={() =>
            props.onPointClick?.({ lat: 37.1, lng: -95.7, label: "United States (US)", isoAlpha2: "US" })
          }
        >
          emit-click
        </button>
      </div>
    );
  }
}));

vi.mock("../utils/countryData", () => ({
  parseCountriesGeoJsonRaw: mockState.parseCountriesGeoJsonRaw
}));

import { MainPage } from "./MainPage";

describe("MainPage", () => {
  it("wires navigate buttons and displays hover/click event labels", () => {
    const onNavigate = vi.fn();
    render(<MainPage page="main" onNavigate={onNavigate} />);

    expect(mockState.parseCountriesGeoJsonRaw).toHaveBeenCalledTimes(1);
    expect(mockState.interactiveGlobeProps?.countries).toHaveLength(1);
    expect(mockState.interactiveGlobeProps?.globeImageUrl).toBeTypeOf("string");

    fireEvent.click(screen.getByText("emit-hover"));
    expect(screen.queryByText("France (FR)")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Flag of France (FR)" })).not.toBeNull();

    fireEvent.click(screen.getByText("emit-click"));
    expect(screen.queryByText("United States (US)")).not.toBeNull();
    expect(screen.getByRole("img", { name: "Flag of United States (US)" })).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Quiz" }));
    expect(onNavigate).toHaveBeenCalledWith("quiz");
  });
});
