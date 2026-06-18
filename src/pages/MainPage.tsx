// Explore mode composition (globe + hover/click info panel).
import { useMemo, useState } from "react";
import { InteractiveGlobe, type GlobeEventData } from "../components/InteractiveGlobe";
import { CountryFlag } from "../components/CountryFlag";
import countriesGeoJsonRaw from "../ne_50m_admin_0_countries.geojson?raw";
import globeImageUrl from "../8081_earthmap10k.jpg";
import { parseCountriesGeoJsonRaw } from "../utils/countryData";
import type { AppPage } from "./types";

type MainPageProps = {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
};

function CountryLabel({ data }: { data: GlobeEventData | null }) {
  return (
    <div className="main-country-label">
      {data ? (
        <CountryFlag code={data.isoAlpha2} className="main-country-flag" ariaLabel={`Flag of ${data.label}`} />
      ) : (
        <div className="main-country-flag main-country-flag-placeholder" aria-hidden="true" />
      )}
      <span>{data?.label ?? "None"}</span>
    </div>
  );
}

export function MainPage({ page, onNavigate }: MainPageProps) {
  const [hovered, setHovered] = useState<GlobeEventData | null>(null);
  const [clicked, setClicked] = useState<GlobeEventData | null>(null);

  const countries = useMemo(() => parseCountriesGeoJsonRaw(countriesGeoJsonRaw), []);

  return (
    <main className="globe-page">
      <section className="globe-wrap globe-wrap-full">
        <InteractiveGlobe
          countries={countries}
          onPointHover={setHovered}
          onPointClick={setClicked}
          globeImageUrl={globeImageUrl}
        />

        <aside className="overlay-modal" role="region" aria-label="Explore controls">
          <nav className="overlay-nav" aria-label="Mode selector">
            <button
              className={`nav-btn${page === "main" ? " active" : ""}`}
              aria-current={page === "main" ? "page" : undefined}
              onClick={() => onNavigate("main")}
            >
              Explore
            </button>
            <button
              className={`nav-btn${page === "quiz" ? " active" : ""}`}
              aria-current={page === "quiz" ? "page" : undefined}
              onClick={() => onNavigate("quiz")}
            >
              Quiz
            </button>
          </nav>

          <div className="overlay-body events">
            <h1>Interactive Globe</h1>
            <p>Drag to rotate. Scroll or pinch to zoom. Hover and click countries for events.</p>
            <h2>Hover</h2>
            <CountryLabel data={hovered} />
            <h2>Click</h2>
            <CountryLabel data={clicked} />
          </div>
        </aside>
      </section>
    </main>
  );
}
