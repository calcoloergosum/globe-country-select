// Flag rendering wrapper built on flag-icons CSS classes.
import type { HTMLAttributes } from "react";
import { hasFlagIcon } from "../utils/flagIcons";

type CountryFlagProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  code?: string | null;
};

export function CountryFlag({ code, className, ...spanProps }: CountryFlagProps) {
  const normalizedCode = code?.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }

  if (!hasFlagIcon(normalizedCode)) {
    return null;
  }

  const iconClassName = `fi fi-${normalizedCode.toLowerCase()}`;
  const mergedClassName = className ? `${iconClassName} ${className}` : iconClassName;

  return <span {...spanProps} className={mergedClassName} />;
}
