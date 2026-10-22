import { loadFont } from "@remotion/fonts";
import { AbsoluteFill, Composition, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { fontFamily } from "./fonts";
import { clamp, FPS, HEIGHT, WIDTH } from "./IranVideo";

// Two-ballots pitch in a warm paper-cutout style: cut-paper shapes with
// rough edges, masking tape, paper-strip marks and stop-motion timing (on twos).

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

// SVG filters referenced by CSS: rough cut edges and torn edges.
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
  </svg>
);

const PaperBackdrop: React.FC = () => (
  <AbsoluteFill>
    <AbsoluteFill style={{ backgroundColor: CREAM }} />
    <AbsoluteFill style={{ backgroundImage: NOISE, opacity: 0.55, mixBlendMode: "multiply" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 50%, rgba(120,84,40,0.28) 100%)" }} />
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


/* ---------- cut-paper marks (strips instead of marker strokes) ---------- */

// One strip of cut paper, centered at (x, y) inside a relative box.
const Strip: React.FC<{ x: number; y: number; len: number; thick: number; angle: number; color: string }> = ({
  x,
  y,
  len,
  thick,
  angle,
  color,
}) => (
  <div style={{ position: "absolute", left: x - len / 2, top: y - thick / 2, rotate: `${angle}deg` }}>
    <Cutout color={color} style={{ width: len, height: thick, borderRadius: 3 }} />
  </div>
);

// Check / cross built from paper strips; pieces land one after the other.
const PaperCheck: React.FC<{ size: number; color: string; progress: number }> = ({ size, color, progress }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {progress > 0 ? <Strip x={size * 0.33} y={size * 0.62} len={size * 0.38} thick={size * 0.15} angle={45} color={color} /> : null}
    {progress > 0.5 ? <Strip x={size * 0.6} y={size * 0.47} len={size * 0.74} thick={size * 0.15} angle={-52} color={color} /> : null}
  </div>
);

const PaperCross: React.FC<{ size: number; color: string; progress: number; thick?: number }> = ({ size, color, progress, thick = 0.15 }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    {progress > 0 ? <Strip x={size / 2} y={size / 2} len={size * 0.95} thick={size * thick} angle={45} color={color} /> : null}
    {progress > 0.5 ? <Strip x={size / 2} y={size / 2} len={size * 0.95} thick={size * thick} angle={-45} color={color} /> : null}
  </div>
);

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
            <PaperCheck size={width * 0.7} color={INK} progress={check} />
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
          {ok ? <PaperCheck size={96} color={INK} progress={draw} /> : <PaperCross size={90} color={RED} progress={draw} />}
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
      {/* Threshold: dashed line of red paper bits */}
      {Array.from({ length: 20 }, (_, i) =>
        i / 20 < line ? (
          <div key={i} style={{ position: "absolute", left: 410 + i * 56, top: BASE_Y - THRESHOLD - 7, rotate: `${jitter(frame, i + 200, 2)}deg` }}>
            <Cutout color={RED} style={{ width: 38, height: 14, borderRadius: 2 }} />
          </div>
        ) : null,
      )}
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

/* ---------- shared scene helpers (absolute time, on twos) ---------- */

const PAPER_BLUE = "#9FC3E0";
const GREY = "#8E8A84";

// Shows children between two absolute times, with a quick paper "lift off" at the end.
const Window: React.FC<{ from: number; to: number; children: React.ReactNode; fade?: boolean }> = ({
  from,
  to,
  children,
  fade = true,
}) => {
  const frame = useStep();
  if (frame < s(from) || frame >= s(to)) return null;
  return (
    <AbsoluteFill style={{ opacity: fade ? interpolate(frame, [s(to) - 6, s(to)], [1, 0], clamp) : 1 }}>{children}</AbsoluteFill>
  );
};

// A paper piece that pops in (overshoot) at an absolute time and sits slightly askew.
const Piece: React.FC<{ at: number; x: number; y: number; rotate?: number; seed: number; children: React.ReactNode }> = ({
  at,
  x,
  y,
  rotate = 0,
  seed,
  children,
}) => {
  const frame = useStep();
  const pop = interpolate(frame, [s(at), s(at) + 10], [0, 1], { ...clamp, easing: outBack });
  if (pop <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        translate: "-50% -50%",
        scale: pop,
        rotate: `${rotate + (1 - pop) * -12 + jitter(frame, seed, 1)}deg`,
      }}
    >
      {children}
    </div>
  );
};

const draw = (frame: number, at: number, dur = 0.45) => interpolate(frame, [s(at), s(at + dur)], [0, 1], clamp);

const HandText: React.FC<{ size: number; color?: string; children: React.ReactNode }> = ({ size, color = INK, children }) => (
  <div style={{ fontFamily: handFamily, fontWeight: 700, fontSize: size, color, lineHeight: 1, direction: "ltr" }}>{children}</div>
);

const BallotBox: React.FC<{ w?: number }> = ({ w = 300 }) => (
  <div style={{ position: "relative", width: w, height: w * 0.9 }}>
    <div style={{ position: "absolute", left: w * 0.3, top: -w * 0.18, rotate: "-4deg" }}>
      <Cutout color={PAPER_WHITE} style={{ width: w * 0.4, height: w * 0.32, borderRadius: 3 }} />
    </div>
    <Cutout color={INK} style={{ width: w, height: w * 0.9, borderRadius: 8 }}>
      <div style={{ position: "absolute", left: w * 0.22, top: w * 0.12, width: w * 0.56, height: w * 0.06, borderRadius: 99, backgroundColor: "#0B1430" }} />
      <div style={{ position: "absolute", left: w * 0.3, top: w * 0.42 }}>
        <Cutout color={PAPER_WHITE} style={{ width: w * 0.4, height: w * 0.22, borderRadius: 3 }}>
          <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <HandText size={w * 0.18}>קלפי</HandText>
          </div>
        </Cutout>
      </div>
    </Cutout>
  </div>
);

/* ---------- 0.0 – 3.0: the idea ---------- */

const IdeaScene: React.FC = () => {
  const frame = useStep();
  return (
    <Window from={0} to={3.0}>
      <Piece at={0.4} x={620} y={520} rotate={-6} seed={21}>
        <div style={{ position: "relative", width: 260, height: 340 }}>
          {frame >= s(0.8)
            ? [0, 45, 90, 135, 180].map((a) => {
                const r = ((a + 180) * Math.PI) / 180;
                return <Strip key={a} x={130 + Math.cos(r) * 190} y={130 + Math.sin(r) * 190} len={70} thick={22} angle={a} color={MUSTARD} />;
              })
            : null}
          <Cutout color={MUSTARD} style={{ width: 260, height: 260, borderRadius: "50%" }} />
          <div style={{ position: "absolute", left: 75, top: 240 }}>
            <Cutout color={GREY} style={{ width: 110, height: 90, borderRadius: 10 }} />
          </div>
        </div>
      </Piece>
      <Piece at={1.8} x={1280} y={560} rotate={4} seed={22}>
        <BallotBox />
      </Piece>
      {/* "a fix": a strip of tape slapped across the box */}
      {frame >= s(2.4) ? (
        <div style={{ position: "absolute", left: 1150, top: 455, scale: interpolate(frame, [s(2.4), s(2.4) + 6], [1.6, 1], clamp) }}>
          <Tape x={0} y={0} rotate={-18} width={280} />
        </div>
      ) : null}
    </Window>
  );
};

/* ---------- 17.8 – 18.8: two things ---------- */

const TwoThingsScene: React.FC = () => (
  <Window from={17.8} to={18.8}>
    {[1, 2].map((n, i) => (
      <Piece key={n} at={17.8 + i * 0.17} x={i === 0 ? 1140 : 780} y={540} rotate={i === 0 ? 4 : -5} seed={30 + n}>
        <Cutout color={n === 1 ? PAPER_WHITE : MUSTARD} style={{ width: 280, height: 340, borderRadius: 4 }}>
          <div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <HandText size={280}>{n}</HandText>
          </div>
          <Tape x={90} y={-18} rotate={-3} width={100} />
        </Cutout>
      </Piece>
    ))}
  </Window>
);

/* ---------- 18.8 – 22.8: no more wasted votes ---------- */

const TrashCan: React.FC = () => (
  <div style={{ position: "relative", width: 300, height: 360 }}>
    <div style={{ position: "absolute", left: -20, top: 0 }}>
      <Cutout color="#6F6B66" style={{ width: 340, height: 50, borderRadius: 10 }} />
    </div>
    <div style={{ position: "absolute", left: 0, top: 60 }}>
      <Cutout color={GREY} style={{ width: 300, height: 300, borderRadius: "6px 6px 30px 30px" }}>
        <div style={{ position: "absolute", inset: "30px 50px", display: "flex", justifyContent: "space-between" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 14, borderRadius: 99, backgroundColor: "#6F6B66" }} />
          ))}
        </div>
      </Cutout>
    </div>
  </div>
);

const NoWastedScene: React.FC = () => {
  const frame = useStep();
  const shift = interpolate(frame, [s(21.3), s(21.7)], [0, -360], { ...clamp, easing: smooth });
  const drops = [-110, 60, -20, 120, -70, 20];
  // A running counter that never settles on a final number while it's on screen.
  const elapsed = Math.max(0, frame - s(21.6)) / FPS;
  const count = Math.floor(elapsed * 260000 + Math.abs(jitter(frame, 7, 997)));
  return (
    <Window from={18.8} to={22.8}>
      <AbsoluteFill style={{ translate: `${shift}px 0px` }}>
        {drops.map((dx, i) => {
          const at = s(19.4) + i * 4;
          if (frame < at || frame > at + 14) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 + dx,
                top: interpolate(frame, [at, at + 12], [-120, 560], { ...clamp, easing: Easing.in(Easing.quad) }),
                translate: "-50% -50%",
                rotate: `${(i % 2 ? 1 : -1) * (18 + i * 6)}deg`,
              }}
            >
              <Cutout color={i % 3 === 0 ? PAPER_GREEN : PAPER_WHITE} style={{ width: 90, height: 117, borderRadius: 2 }} />
            </div>
          );
        })}
        <Piece at={18.8} x={960} y={640} seed={41}>
          <TrashCan />
        </Piece>
        {frame >= s(20.4) ? (
          <div style={{ position: "absolute", left: 960, top: 620, translate: "-50% -50%" }}>
            <div style={{ position: "relative", width: 460, height: 460, scale: interpolate(frame, [s(20.4), s(20.4) + 6], [1.4, 1], clamp) }}>
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  backgroundColor: RED,
                  WebkitMask: "radial-gradient(circle, transparent 60%, black 61%)",
                  mask: "radial-gradient(circle, transparent 60%, black 61%)",
                  filter: "url(#rough-cut) drop-shadow(3px 6px 0 rgba(60,40,20,0.18))",
                }}
              />
              <Strip x={230} y={230} len={400} thick={60} angle={45} color={RED} />
            </div>
          </div>
        ) : null}
      </AbsoluteFill>
      <Piece at={21.6} x={1330} y={540} rotate={-3} seed={42}>
        <Cutout color={PAPER_WHITE} style={{ width: 620, height: 300, borderRadius: 4 }}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6 }}>
            <HandText size={70} color={RED}>
              2022
            </HandText>
            <HandText size={170}>{count.toLocaleString("en-US")}</HandText>
          </div>
          <Tape x={250} y={-18} rotate={2} width={120} />
        </Cutout>
      </Piece>
    </Window>
  );
};

/* ---------- 22.8 – 28.0: no gambling, a backup vote ---------- */

const Die: React.FC<{ pips: [number, number][] }> = ({ pips }) => (
  <Cutout color={PAPER_WHITE} style={{ width: 200, height: 200, borderRadius: 28 }}>
    {pips.map(([x, y], i) => (
      <div key={i} style={{ position: "absolute", left: x - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%", backgroundColor: INK }} />
    ))}
  </Cutout>
);

const LifeBuoy: React.FC = () => (
  <div
    style={{
      width: 300,
      height: 300,
      borderRadius: "50%",
      background: `conic-gradient(${RED} 0 45deg, ${PAPER_WHITE} 45deg 90deg, ${RED} 90deg 135deg, ${PAPER_WHITE} 135deg 180deg, ${RED} 180deg 225deg, ${PAPER_WHITE} 225deg 270deg, ${RED} 270deg 315deg, ${PAPER_WHITE} 315deg 360deg)`,
      WebkitMask: "radial-gradient(circle, transparent 38%, black 39%)",
      mask: "radial-gradient(circle, transparent 38%, black 39%)",
      filter: "url(#rough-cut) drop-shadow(3px 6px 0 rgba(60,40,20,0.18))",
    }}
  />
);

const NoGamblingScene: React.FC = () => {
  const frame = useStep();
  const out = interpolate(frame, [s(25.4), s(25.8)], [1, 0], clamp);
  return (
    <Window from={22.8} to={28.0}>
      <AbsoluteFill style={{ opacity: out, translate: `${(1 - out) * -200}px 0px` }}>
        <Piece at={23.6} x={860} y={540} rotate={-14} seed={51}>
          <Die pips={[[50, 50], [100, 100], [150, 150]]} />
        </Piece>
        <Piece at={23.75} x={1080} y={570} rotate={10} seed={52}>
          <Die pips={[[50, 50], [150, 50], [50, 150], [150, 150]]} />
        </Piece>
        {frame >= s(24.6) ? (
          <div style={{ position: "absolute", left: 970, top: 550, translate: "-50% -50%" }}>
            <PaperCross size={440} color={RED} progress={draw(frame, 24.6, 0.25)} thick={0.11} />
          </div>
        ) : null}
      </AbsoluteFill>
      <Piece at={26.0} x={560} y={540} rotate={-5} seed={53}>
        <div style={{ position: "relative" }}>
          <Slip kind="white" n={1} width={220} check={0} seed={54} />
          <div style={{ position: "absolute", left: 10, top: 40 }}>
            <PaperCross size={200} color={RED} progress={draw(frame, 26.2, 0.25)} />
          </div>
        </div>
      </Piece>
      <Piece at={27.3} x={960} y={540} seed={55}>
        <LifeBuoy />
      </Piece>
      <Piece at={27.4} x={1360} y={540} rotate={6} seed={56}>
        <Slip kind="green" n={2} width={220} check={draw(frame, 27.6, 0.3)} seed={57} />
      </Piece>
    </Window>
  );
};

/* ---------- 28.0 – 32.6: no mini-parties ---------- */

const StabilityScene: React.FC = () => {
  const frame = useStep();
  const minis = [90, 140, 60, 120, 80, 150, 70, 110, 95, 130, 65, 105];
  const colors = [PAPER_WHITE, MUSTARD, PAPER_BLUE, PAPER_GREEN, "#E8A0A0"];
  const wobble = interpolate(frame, [s(29.6), s(30.2)], [1, 4], clamp);
  return (
    <Window from={28.0} to={32.6}>
      <div style={{ position: "absolute", left: 220, top: 790, width: 1480, height: 46 }}>
        <Cutout color={KRAFT} edge="torn" style={{ width: "100%", height: 46 }} />
      </div>
      {minis.map((h, i) => {
        const at = s(28.6) + i * 2;
        const height = interpolate(frame, [at, at + 8], [0, h * 2], { ...clamp, easing: outBack });
        if (height < 2) return null;
        return (
          <div key={i} style={{ position: "absolute", left: 255 + i * 120, top: 796 - height, rotate: `${jitter(frame, i + 60, wobble)}deg` }}>
            <Cutout color={colors[i % colors.length]} style={{ width: 90, height, borderRadius: 2 }} />
          </div>
        );
      })}
      {frame >= s(30.2) ? (
        <div style={{ position: "absolute", left: 960, top: 640, translate: "-50% -50%" }}>
          <div style={{ position: "relative", width: 1500, height: 420 }}>
            <Strip x={750} y={210} len={1560} thick={46} angle={15.6} color={RED} />
            {draw(frame, 30.2, 0.25) > 0.5 ? <Strip x={750} y={210} len={1560} thick={46} angle={-15.6} color={RED} /> : null}
          </div>
        </div>
      ) : null}
    </Window>
  );
};

/* ---------- 32.6 – 38.8: reality show → power to the people ---------- */

const TV: React.FC = () => (
  <div style={{ position: "relative", width: 420, height: 340 }}>
    <Strip x={170} y={-30} len={110} thick={16} angle={50} color={INK} />
    <Strip x={250} y={-30} len={110} thick={16} angle={-50} color={INK} />
    <Cutout color={INK} style={{ width: 420, height: 320, borderRadius: 26 }}>
      <div style={{ position: "absolute", left: 30, top: 30 }}>
        <Cutout color={PAPER_BLUE} style={{ width: 280, height: 260, borderRadius: 30 }} />
      </div>
      {[0, 1].map((i) => (
        <div key={i} style={{ position: "absolute", left: 340, top: 70 + i * 90, width: 50, height: 50, borderRadius: "50%", backgroundColor: MUSTARD }} />
      ))}
    </Cutout>
  </div>
);

const Popcorn: React.FC = () => (
  <div style={{ position: "relative", width: 200, height: 260 }}>
    {[
      [30, 0],
      [90, -20],
      [140, 10],
      [60, 30],
      [115, 35],
    ].map(([x, y], i) => (
      <div key={i} style={{ position: "absolute", left: x - 20, top: y }}>
        <Cutout color="#FFF3D6" style={{ width: 70, height: 64, borderRadius: "50%" }} />
      </div>
    ))}
    <div style={{ position: "absolute", left: 0, top: 70 }}>
      <Cutout
        color={PAPER_WHITE}
        style={{ width: 200, height: 190, borderRadius: "4px 4px 18px 18px", clipPath: "polygon(0 0, 100% 0, 88% 100%, 12% 100%)" }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `repeating-linear-gradient(90deg, ${RED} 0 30px, transparent 30px 60px)`,
            opacity: 0.85,
          }}
        />
      </Cutout>
    </div>
  </div>
);

const Citizen: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    <Cutout color={color} style={{ width: 76, height: 76, borderRadius: "50%" }} />
    <Cutout color={color} style={{ width: 120, height: 130, borderRadius: "60px 60px 14px 14px" }} />
  </div>
);

const PowerScene: React.FC = () => {
  const frame = useStep();
  const crowdColors = [PAPER_BLUE, MUSTARD, PAPER_WHITE, PAPER_GREEN, "#E8A0A0", PAPER_BLUE, MUSTARD];
  return (
    <Window from={32.6} to={38.8}>
      <Window from={33.2} to={34.5}>
        <Piece at={33.2} x={960} y={560} seed={71}>
          <BallotBox w={320} />
        </Piece>
      </Window>
      <Window from={34.6} to={35.9}>
        <Piece at={34.6} x={880} y={560} rotate={-4} seed={72}>
          <TV />
        </Piece>
        <Piece at={35.0} x={1200} y={640} rotate={8} seed={73}>
          <Popcorn />
        </Piece>
      </Window>
      {crowdColors.map((c, i) => (
        <Piece key={i} at={36.2 + i * 0.07} x={960 + (i - 3) * 190} y={780} seed={80 + i}>
          <Citizen color={c} />
        </Piece>
      ))}
      {frame >= s(37.8) ? (
        <>
          {frame >= s(38.0) ? (
            <div style={{ position: "absolute", left: 960 - 260, top: 360 - 260, width: 520, height: 520 }}>
              {Array.from({ length: 10 }, (_, k) => {
                const a = (k / 10) * Math.PI * 2;
                return <Strip key={k} x={260 + Math.cos(a) * 210} y={260 + Math.sin(a) * 210} len={60} thick={18} angle={(a * 180) / Math.PI} color={MUSTARD} />;
              })}
            </div>
          ) : null}
          <Piece at={37.8} x={960} y={360} rotate={-4} seed={90}>
            <Slip kind="white" n={1} width={200} check={draw(frame, 38.1, 0.35)} seed={91} />
          </Piece>
        </>
      ) : null}
    </Window>
  );
};

/* ---------- 38.8 – 40: what do you think? ---------- */

const QuestionScene: React.FC = () => {
  const frame = useStep();
  return (
    <Window from={38.8} to={40.1} fade={false}>
      <Piece at={38.8} x={960} y={520} rotate={-3} seed={95}>
        <div style={{ position: "relative", width: 520, height: 400 }}>
          <Cutout color={PAPER_WHITE} style={{ width: 520, height: 340, borderRadius: 170 }} />
          <div style={{ position: "absolute", left: 110, top: 300, rotate: "20deg" }}>
            <Cutout color={PAPER_WHITE} style={{ width: 90, height: 100, clipPath: "polygon(0 0, 100% 0, 0 100%)" }} />
          </div>
          <div style={{ position: "absolute", left: 0, top: 0, width: 520, height: 340, display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{ opacity: draw(frame, 39.0, 0.2) }}>
              <HandText size={260} color={RED}>
                ?
              </HandText>
            </div>
          </div>
        </div>
      </Piece>
    </Window>
  );
};

/* ---------- compositions ---------- */

export const PaperCard: React.FC<{ backdrop?: boolean }> = ({ backdrop = true }) => (
  <AbsoluteFill style={{ fontFamily, direction: "rtl", overflow: "hidden" }}>
    <PaperFilters />
    {backdrop ? <PaperBackdrop /> : null}
    <Sequence name="Threshold chart" from={s(11.2)} durationInFrames={s(17.8) - s(11.2)}>
      <ThresholdChart />
    </Sequence>
    <Sequence name="Ballot slips" from={0} durationInFrames={s(17.8)}>
      <Slips />
    </Sequence>
    <IdeaScene />
    <TwoThingsScene />
    <NoWastedScene />
    <NoGamblingScene />
    <StabilityScene />
    <PowerScene />
    <QuestionScene />
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
