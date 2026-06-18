// Flag rendering wrapper built on flag-icons CSS classes.
import type { HTMLAttributes } from "react";
import { hasFlagIcon } from "../utils/flagIcons";

type CountryFlagProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  code?: string | null;
  decorative?: boolean;
  ariaLabel?: string;
};

export function CountryFlag({
  code,
  className,
  decorative,
  ariaLabel,
  role,
  "aria-label": spanAriaLabel,
  "aria-hidden": spanAriaHidden,
  ...spanProps
}: CountryFlagProps) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  if (!hasFlagIcon(normalizedCode)) {
    return null;
  }

  const iconClassName = `fi fi-${normalizedCode.toLowerCase()}`;
  const mergedClassName = className ? `${iconClassName} ${className}` : iconClassName;
  const accessibilityProps = decorative
    ? { "aria-hidden": true }
    : {
        role: ariaLabel ? "img" : role,
        "aria-label": ariaLabel ?? spanAriaLabel,
        "aria-hidden": spanAriaHidden
      };

  return <span {...spanProps} {...accessibilityProps} className={mergedClassName} />;
}
