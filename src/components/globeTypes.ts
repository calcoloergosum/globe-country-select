export type GlobeEventData = {
  lat: number;
  lng: number;
  label: string;
  isoAlpha2?: string;
};

type CountryProperties = {
  ADMIN?: string;
  NAME?: string;
  ISO_A2?: string;
  ISO_A2_EH?: string;
  WB_A2?: string;
  LABEL_X?: number;
  LABEL_Y?: number;
};

export type CountryFeature = {
  type: "Feature";
  properties: CountryProperties;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
  bbox?: [number, number, number, number];
};