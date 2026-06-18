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
    expect(span?.getAttribute("role")).toBe("img");
  });

  it("renders an image role and accessible label when ariaLabel is provided", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(<CountryFlag code="fr" ariaLabel="Flag of France" />);

    const span = container.querySelector("span");
    expect(span?.getAttribute("role")).toBe("img");
    expect(span?.getAttribute("aria-label")).toBe("Flag of France");
    expect(span?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("renders decorative flags as hidden from assistive technology", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(<CountryFlag code="fr" decorative />);

    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
    expect(span?.hasAttribute("role")).toBe(false);
  });

  it("preserves an explicit role when a label is provided", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(
      <CountryFlag code="fr" role="presentation" aria-label="Flag of France" />
    );

    const span = container.querySelector("span");
    expect(span?.getAttribute("role")).toBe("presentation");
    expect(span?.getAttribute("aria-label")).toBe("Flag of France");
  });

  it("lets decorative flags win over ariaLabel", () => {
    hasFlagIconMock.mockReturnValue(true);
    const { container } = render(<CountryFlag code="fr" decorative ariaLabel="Flag of France" />);

    const span = container.querySelector("span");
    expect(span?.getAttribute("aria-hidden")).toBe("true");
    expect(span?.hasAttribute("role")).toBe(false);
    expect(span?.hasAttribute("aria-label")).toBe(false);
  });
});
