// Shared domain types for country features and event payload.
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

export type CountryCoordinate = [number, number];
export type CountryPolygonCoordinates = CountryCoordinate[][];
export type CountryMultiPolygonCoordinates = CountryPolygonCoordinates[];

export type CountryGeometry =
  | {
      type: "Polygon";
      coordinates: CountryPolygonCoordinates;
    }
  | {
      type: "MultiPolygon";
      coordinates: CountryMultiPolygonCoordinates;
    };

export type CountryFeature = {
  type: "Feature";
  properties: CountryProperties;
  geometry: CountryGeometry;
  bbox?: [number, number, number, number];
};