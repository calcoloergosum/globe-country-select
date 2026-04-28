import { useMemo, useState } from "react";
import { InteractiveGlobe, type CountryFeature, type GlobeEventData } from "../components/InteractiveGlobe";
import { CountryFlag } from "../components/CountryFlag";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../8081_earthmap10k.jpg";

function CountryLabel({ data }: { data: GlobeEventData | null }) {
  return (
    <div className="main-country-label">
      {data ? (
        <CountryFlag code={data.isoAlpha2} className="main-country-flag" />
      ) : (
        <div className="main-country-flag main-country-flag-placeholder" aria-hidden="true" />
      )}
      <span>{data?.label ?? "None"}</span>
    </div>
  );
}

export function MainPage() {
  const [hovered, setHovered] = useState<GlobeEventData | null>(null);
  const [clicked, setClicked] = useState<GlobeEventData | null>(null);

  const countries = useMemo(() => {
    const parsed = JSON.parse(countriesGeoJsonRaw) as { features?: CountryFeature[] };
    return parsed.features ?? [];
  }, []);

  return (
    <main className="page">
      <section className="panel">
        <h1>Interactive Globe</h1>
        <p>Drag to rotate. Scroll or pinch to zoom. Hover and click countries for events.</p>
        <div className="events">
          <h2>Hover</h2>
          <CountryLabel data={hovered} />
          <h2>Click</h2>
          <CountryLabel data={clicked} />
        </div>
      </section>

      <section className="globe-wrap">
        <InteractiveGlobe
          countries={countries}
          onPointHover={setHovered}
          onPointClick={setClicked}
          globeImageUrl={globeImageUrl}
        />
      </section>
    </main>
  );
}
