// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const hasFlagIconMock = vi.hoisted(() => vi.fn());

vi.mock("../utils/flagIcons", () => ({
  hasFlagIcon: hasFlagIconMock
}));

import { CountryFlag } from "./CountryFlag";

describe("CountryFlag", () => {
  it("returns null when code is missing", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(<CountryFlag code={undefined} />);

    expect(container.firstChild).toBeNull();
    expect(hasFlagIconMock).not.toHaveBeenCalled();
  });

  it("returns null when code is unsupported", () => {
    hasFlagIconMock.mockReturnValue(false);
    const { container } = render(<CountryFlag code=" zz " />);

    expect(hasFlagIconMock).toHaveBeenCalledWith("ZZ");
    expect(container.firstChild).toBeNull();
  });

  it("renders a flag span for supported codes with merged class names", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(
      <CountryFlag code=" fr " className="quiz-flag" aria-label="country-flag" />
    );

    const span = container.querySelector("span");
    expect(hasFlagIconMock).toHaveBeenCalledWith("FR");
    expect(span).not.toBeNull();
    expect(span?.className).toContain("fi fi-fr");
    expect(span?.className).toContain("quiz-flag");
    expect(span?.getAttribute("aria-label")).toBe("country-flag");
  });
});
