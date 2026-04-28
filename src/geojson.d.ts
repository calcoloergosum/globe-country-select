declare module "*.geojson" {
  const value: {
    type: string;
    features?: unknown[];
    bbox?: [number, number, number, number];
  };
  export default value;
}

declare module "*.geojson?raw" {
  const value: string;
  export default value;
}
