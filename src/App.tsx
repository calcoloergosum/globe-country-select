import { useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { MainPage } from "./pages/MainPage";
import { QuizPage } from "./pages/QuizPage";

type Page = "main" | "quiz";

function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createRadialGradient(
        canvas.width * 0.18, canvas.height * 0.20, 0,
        canvas.width * 0.5, canvas.height * 0.5, Math.max(canvas.width, canvas.height) * 0.8,
      );
      bg.addColorStop(0, "#163f5b");
      bg.addColorStop(0.45, "#102231");
      bg.addColorStop(1, "#070e16");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const STAR_COUNT = 600;
      let seed = 42;
      const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };

      for (let i = 0; i < STAR_COUNT; i++) {
        const x = rand() * canvas.width;
        const y = rand() * canvas.height;
        const r = rand() * 1.2 + 0.2;
        const alpha = rand() * 0.6 + 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.fill();
      }
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        display: "block",
      }}
    />
  );
}

function App() {
  const [page, setPage] = useState<Page>("main");

  return (
    <div className="app-shell">
      <StarField />
      <Header page={page} onNavigate={setPage} />
      {page === "main" ? <MainPage /> : <QuizPage />}
    </div>
  );
}

export default App;
