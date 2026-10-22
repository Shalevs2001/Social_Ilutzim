import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, Composition, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "./fonts";
import { clamp, FPS, HEIGHT, WIDTH } from "./IranVideo";

// Two-ballots pitch in a warm paper-cutout style: cut-paper shapes with
// rough edges, masking tape, marker strokes and stop-motion timing (on twos).
// This file holds the sample segment (3.0s – 17.8s): slips + threshold chart.

const handFamily = "Amatic SC";
loadFont({ family: handFamily, url: staticFile("fonts/AmaticSC-Bold.ttf"), weight: "700" });

const CREAM = "#EFE4CC";
const INK = "#1D2B4F";
const RED = "#D9412E";
const MUSTARD = "#E8B43A";
const PAPER_WHITE = "#FBF8F1";
const PAPER_GREEN = "#5DAE5B";
const KRAFT = "#B98A5A";

const s = (sec: number) => Math.round(sec * FPS);
const smooth = Easing.bezier(0.65, 0, 0.35, 1);
const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);

// Stop-motion: hold every pose for two frames.
const useStep = () => Math.floor(useCurrentFrame() / 2) * 2;
// Small deterministic wobble that changes every 4 frames, like hand-placed paper.
const jitter = (frame: number, seed: number, amount = 1) => {
  const n = Math.sin((Math.floor(frame / 4) + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return (n - Math.floor(n) - 0.5) * 2 * amount;
};

/* ---------- textures & filters ---------- */

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

// SVG filters referenced by CSS: rough cut edges and ragged marker strokes.
const PaperFilters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="rough-cut">
      <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={3} seed={4} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={10} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="torn">
      <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves={4} seed={9} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={14} xChannelSelector="R" yChannelSelector="G" />
    </filter>
    <filter id="marker">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={2} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </svg>
);

const PaperBackdrop: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ backgroundColor: CREAM }} />
    <AbsoluteFill style={{ backgroundImage: NOISE, opacity: 0.55, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(120,84,40,0.28) 100%)" }} />
  </AbsoluteFill>
);

// Torn newspaper scrap: grey paper with columns of "text" lines.
const NewsScrap: React.FC<{ x: number; y: number; w: number; h: number; rotate: number; seed: number }> = ({ x, y, w, h, rotate, seed }) => {
  const frame = useStep();
  const rows = Math.floor((h - 30) / 22);
  return (
    <div style={{ position: "absolute", left: x, top: y, rotate: `${rotate + jitter(frame, seed, 0.4)}deg`, opacity: 0.85 }}>
      <Cutout color="#DCD6CA" edge="torn" style={{ width: w, height: h }}>
        <div style={{ position: "absolute", inset: 18, display: "flex", gap: 16 }}>
          {[0, 1].map((col) => (
            <div key={col} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: rows }, (_, i) => (
                <div
                  key={i}
                  style={{
                    height: 8,
                    width: `${70 + ((i * 37 + col * 13 + seed * 7) % 30)}%`,
                    alignSelf: "flex-end",
                    backgroundColor: "#5A5A5A",
                    opacity: 0.35,
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </Cutout>
    </div>
  );
};

const Collage: React.FC = () => (
  <AbsoluteFill>
    <NewsScrap x={-60} y={-40} w={340} h={260} rotate={-8} seed={1} />
    <NewsScrap x={1650} y={760} w={360} h={300} rotate={7} seed={2} />
    <NewsScrap x={-80} y={860} w={300} h={240} rotate={5} seed={3} />
  </AbsoluteFill>
);

// A piece of cut paper: rough edges, paper grain, and a soft drop shadow.
const Cutout: React.FC<{ color: string; style?: React.CSSProperties; children?: React.ReactNode; edge?: string }> = ({
  color,
  style,
  children,
  edge = "rough-cut",
}) => (
  <div style={{ position: "relative", filter: "drop-shadow(3px 6px 0 rgba(60,40,20,0.18)) drop-shadow(0 10px 14px rgba(60,40,20,0.22))", ...style }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: color,
        backgroundImage: NOISE,
        backgroundBlendMode: "multiply",
        borderRadius: style?.borderRadius,
        filter: `url(#${edge})`,
      }}
    />
    <div style={{ position: "relative", width: "100%", height: "100%" }}>{children}</div>
  </div>
);

const Tape: React.FC<{ x: number; y: number; rotate: number; width?: number }> = ({ x, y, rotate, width = 120 }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      height: 38,
      rotate: `${rotate}deg`,
      backgroundColor: "rgba(236,222,180,0.82)",
      backgroundImage: NOISE,
      backgroundBlendMode: "multiply",
      filter: "url(#torn)",
      boxShadow: "0 2px 4px rgba(60,40,20,0.15)",
    }}
  />
);

// Hand-drawn marker stroke along an SVG path, drawn on twos.
const Marker: React.FC<{ d: string; progress: number; color?: string; width?: number; size: number; style?: React.CSSProperties }> = ({
  d,
  progress,
  color = INK,
  width = 9,
  size,
  style,
}) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size, overflow: "visible", filter: "url(#marker)", ...style }}>
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - progress}
    />
  </svg>
);

const CHECK = "M14 56 C 24 62, 32 72, 40 80 C 52 58, 70 36, 90 18";
const CROSS = "M18 18 C 40 42, 60 60, 84 84 M84 16 C 62 40, 40 62, 16 86";

/* ---------- ballot slip ---------- */

const Slip: React.FC<{ kind: "white" | "green"; n: number; width?: number; check: number; seed: number }> = ({
  kind,
  n,
  width = 260,
  check,
  seed,
}) => {
  const frame = useStep();
  return (
    <div style={{ position: "relative", width, height: width * 1.3, rotate: `${jitter(frame, seed, 1.2)}deg` }}>
      <Cutout color={kind === "white" ? PAPER_WHITE : PAPER_GREEN} style={{ width, height: width * 1.3, borderRadius: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: width * 0.08 }}>
          {[0.6, 0.45, 0.3].map((w) => (
            <div key={w} style={{ width: width * w, height: width * 0.05, borderRadius: 99, backgroundColor: INK, opacity: 0.25 }} />
          ))}
        </div>
        <div style={{ position: "absolute", top: -width * 0.14, right: -width * 0.12 }}>
          <Cutout color={INK} style={{ width: width * 0.36, height: width * 0.36, borderRadius: "50%" }}>
            <div
              style={{
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: PAPER_WHITE,
                fontFamily: handFamily,
                fontWeight: 700,
                fontSize: width * 0.32,
              }}
            >
              {n}
            </div>
          </Cutout>
        </div>
        <Tape x={width * 0.3} y={-18} rotate={-4 + jitter(frame, seed + 3, 1)} width={width * 0.4} />
        {check > 0 ? (
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <Marker d={CHECK} progress={check} size={width * 0.8} width={11} />
          </div>
        ) : null}
      </Cutout>
    </div>
  );
};

/* ---------- slip choreography (same beats as the voice-over) ---------- */

type Key = [sec: number, x: number, y: number, scale: number, opacity: number];

const PARTY = { first: 1180, second: 740 }; // first choice on the right (RTL)
const BASE_Y = 900;
const THRESHOLD = 260;

const WHITE_SLIP: Key[] = [
  [3.1, 960, 560, 0.4, 0],
  [3.5, 960, 540, 1, 1],
  [4.8, 960, 540, 1, 1],
  [5.3, 1180, 540, 1, 1],
  [5.4, 1180, 540, 1, 1],
  [6.0, 960, 520, 1.3, 1],
  [8.0, 960, 520, 1.3, 1],
  [8.6, 1240, 540, 1, 1],
  [11.2, 1240, 540, 1, 1],
  [11.6, 1660, 280, 0.5, 1],
  [12.0, 1660, 280, 0.5, 1],
  [12.6, PARTY.first, 780, 0.25, 1],
  [12.8, PARTY.first, 780, 0.25, 0],
  [14.4, 1660, 280, 0.5, 0],
  [14.6, 1660, 280, 0.5, 1],
  [14.9, 1660, 280, 0.5, 1],
  [15.4, PARTY.first, 820, 0.25, 1],
  [15.6, PARTY.first, 820, 0.25, 0],
];

const GREEN_SLIP: Key[] = [
  [4.8, 960, 540, 0.9, 0],
  [5.3, 740, 540, 1, 1],
  [5.4, 740, 540, 1, 1],
  [5.9, 700, 560, 0.8, 0],
  [9.0, 280, 540, 1, 0],
  [9.6, 680, 540, 1, 1],
  [11.2, 680, 540, 1, 1],
  [11.6, 260, 280, 0.5, 1],
  [16.2, 260, 280, 0.5, 1],
  [16.9, PARTY.second, 600, 0.25, 1],
  [17.1, PARTY.second, 600, 0.25, 0],
];

const track = (frame: number, keys: Key[]) => {
  const t = keys.map((k) => s(k[0]));
  return {
    left: interpolate(frame, t, keys.map((k) => k[1]), { ...clamp, easing: smooth }),
    top: interpolate(frame, t, keys.map((k) => k[2]), { ...clamp, easing: smooth }),
    scale: interpolate(frame, t, keys.map((k) => k[3]), { ...clamp, easing: smooth }),
    opacity: interpolate(frame, t, keys.map((k) => k[4]), clamp),
  };
};

const Slips: React.FC = () => {
  const frame = useStep();
  const place = (keys: Key[], child: React.ReactNode) => {
    const p = track(frame, keys);
    return (
      <div style={{ position: "absolute", left: p.left, top: p.top, translate: "-50% -50%", scale: p.scale, opacity: p.opacity }}>{child}</div>
    );
  };
  const draw = (from: number) => interpolate(frame, [s(from), s(from + 0.5)], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {place(GREEN_SLIP, <Slip kind="green" n={2} check={draw(10.2)} seed={2} />)}
      {place(WHITE_SLIP, <Slip kind="white" n={1} check={draw(7.2)} seed={1} />)}
    </AbsoluteFill>
  );
};

/* ---------- threshold chart (11.2s – 17.8s) ---------- */

const PaperBar: React.FC<{ x: number; height: number; color: string; seed: number }> = ({ x, height, color, seed }) => {
  const frame = useStep();
  if (height < 2) return null;
  return (
    <div style={{ position: "absolute", left: x - 110, top: BASE_Y - height, width: 220, height, rotate: `${jitter(frame, seed, 0.6)}deg` }}>
      <Cutout color={color} style={{ width: 220, height, borderRadius: 3 }} />
    </div>
  );
};

// `frame` is absolute (the chart's Sequence starts at 11.2s).
const Stamp: React.FC<{ at: number; x: number; y: number; ok: boolean; frame: number }> = ({ at, x, y, ok, frame }) => {
  const pop = interpolate(frame, [s(at), s(at) + 8], [0, 1], { ...clamp, easing: outBack });
  const draw = interpolate(frame, [s(at) + 4, s(at) + 16], [0, 1], clamp);
  if (pop <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: pop, rotate: `${-8 + jitter(frame, at, 2)}deg` }}>
      <Cutout color={ok ? MUSTARD : PAPER_WHITE} style={{ width: 150, height: 150, borderRadius: "50%" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <Marker d={ok ? CHECK : CROSS} progress={draw} size={100} color={ok ? INK : RED} width={12} />
        </div>
      </Cutout>
    </div>
  );
};

const ThresholdChart: React.FC = () => {
  const frame = useStep() + s(11.2); // absolute time inside this Sequence
  const sec = frame / FPS;
  const ease = { ...clamp, easing: smooth };
  const first = interpolate(sec, [12.2, 13.0, 14.2, 14.5, 15.0, 15.6], [0, 420, 420, 0, 0, 170], ease);
  const second = interpolate(sec, [14.5, 15.0], [0, 360], ease);
  const baseline = interpolate(sec, [11.2, 11.6], [0, 1], ease);
  const line = interpolate(sec, [11.6, 12.2], [0, 1], clamp);
  return (
    <AbsoluteFill>
      {/* Kraft-paper ground strip */}
      <div style={{ position: "absolute", left: 960 - 560 * baseline, top: BASE_Y - 4, width: 1120 * baseline, height: 46 }}>
        <Cutout color={KRAFT} edge="torn" style={{ width: "100%", height: 46 }} />
      </div>
      <PaperBar x={PARTY.second} height={second} color={PAPER_GREEN} seed={5} />
      <PaperBar x={PARTY.first} height={first} color={PAPER_WHITE} seed={6} />
      {/* Threshold: dashed red marker line */}
      <svg
        viewBox="0 0 1100 20"
        style={{ position: "absolute", left: 410, top: BASE_Y - THRESHOLD - 10, width: 1100, height: 20, overflow: "visible", filter: "url(#marker)" }}
      >
        <path
          d="M0 10 L1100 10"
          stroke={RED}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="34 22"
          style={{ clipPath: `inset(0 ${(1 - line) * 100}% 0 0)` }}
        />
      </svg>
      {/* Sticky note label */}
      {sec >= 12.0 ? (
        <div
          style={{
            position: "absolute",
            left: 1520,
            top: BASE_Y - THRESHOLD - 70,
            rotate: `${6 + jitter(frame, 11, 1.5)}deg`,
            scale: interpolate(sec, [12.0, 12.3], [0.4, 1], { ...clamp, easing: outBack }),
          }}
        >
          <Cutout color={MUSTARD} style={{ width: 230, height: 130, borderRadius: 2 }}>
            <div
              style={{
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily: handFamily,
                fontWeight: 700,
                fontSize: 96,
                color: INK,
                direction: "ltr",
              }}
            >
              3.25%
            </div>
            <Tape x={70} y={-16} rotate={-3} width={90} />
          </Cutout>
        </div>
      ) : null}
      {sec < 14.2 ? <Stamp at={13.4} x={PARTY.first} y={BASE_Y - 420 - 110} ok frame={frame} /> : null}
      <Stamp at={15.5} x={PARTY.first} y={BASE_Y - 170 - 100} ok={false} frame={frame} />
      <Stamp at={17.0} x={PARTY.second} y={BASE_Y - 360 - 110} ok frame={frame} />
    </AbsoluteFill>
  );
};

/* ---------- compositions ---------- */

export const PaperCard: React.FC<{ backdrop?: boolean }> = ({ backdrop = true }) => (
  <AbsoluteFill style={{ fontFamily, direction: "rtl", overflow: "hidden" }}>
    <PaperFilters />
    {backdrop ? <PaperBackdrop /> : null}
    <Collage />
    <Sequence name="Threshold chart" from={s(11.2)} durationInFrames={s(17.8) - s(11.2)}>
      <ThresholdChart />
    </Sequence>
    <Sequence name="Ballot slips" from={0} durationInFrames={s(17.8)}>
      <Slips />
    </Sequence>
  </AbsoluteFill>
);

// Final vertical video: a torn sheet of paper under the captions, holding the scene.
const OUT_W = 1080;
const OUT_H = 1920;
const CARD_TOP = 1240;
const CARD_SCALE = OUT_W / WIDTH;
const CARD_CANVAS_H = (OUT_H - CARD_TOP) / CARD_SCALE;

export const PaperFinal: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <PaperFilters />
    <OffthreadVideo src={staticFile("input/ballot-source.mp4")} style={{ width: OUT_W, height: OUT_H, objectFit: "cover" }} />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: CARD_TOP,
        width: WIDTH,
        height: CARD_CANVAS_H,
        transformOrigin: "top left",
        scale: CARD_SCALE,
      }}
    >
      <div style={{ position: "absolute", left: -40, right: -40, top: 0, bottom: -40, filter: "drop-shadow(0 -10px 16px rgba(0,0,0,0.35))" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: CREAM,
            backgroundImage: NOISE,
            backgroundBlendMode: "multiply",
            filter: "url(#torn)",
          }}
        />
      </div>
      <div style={{ position: "absolute", left: 0, top: (CARD_CANVAS_H - HEIGHT) / 2 + 10, width: WIDTH, height: HEIGHT }}>
        <PaperCard backdrop={false} />
      </div>
    </div>
  </AbsoluteFill>
);

export const PaperComposition = () => (
  <>
    <Composition id="TwoBallotsPaperCard" component={PaperCard} durationInFrames={40 * FPS} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TwoBallotsPaperFinal" component={PaperFinal} durationInFrames={40 * FPS} fps={FPS} width={OUT_W} height={OUT_H} />
  </>
);
