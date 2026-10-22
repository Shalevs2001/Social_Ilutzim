import { Ban, Check, Dices, LifeBuoy, Lightbulb, MessageCircleQuestion, Popcorn, Trash2, Tv, Vote, Wrench, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "./fonts";
import { clamp, FPS, HEIGHT, inOut, outExpo, Person, WIDTH } from "./IranVideo";

// Two-ballots pitch, v2: synced to the recorded voice-over (timings read from
// the burned-in captions), flat icons instead of emoji, a tighter palette, and
// ballot slips that stay on screen across scenes.

const WHITE = "#FFFFFF";
const NAVY = "#0B1B3F";
const YELLOW = "#FFD60A";
const RED = "#FF4D5E";
const GLASS = "rgba(255,255,255,0.09)";
const GLASS_EDGE = "rgba(255,255,255,0.22)";
const SHADOW = "drop-shadow(0 14px 28px rgba(4,12,40,0.45))";

const DURATION = 40 * FPS;
const s = (sec: number) => Math.round(sec * FPS);

// Scene boundaries (seconds), aligned to the spoken lines.
const SCENES = [
  { name: "Idea", from: 0, to: 3.0 },
  { name: "Threshold chart", from: 11.2, to: 17.8 },
  { name: "Two things", from: 17.8, to: 18.8 },
  { name: "No wasted votes", from: 18.8, to: 22.8 },
  { name: "No gambling", from: 22.8, to: 28.0 },
  { name: "Stability", from: 28.0, to: 32.6 },
  { name: "Power to the people", from: 32.6, to: 38.8 },
  { name: "What do you think", from: 38.8, to: 40 },
];

/* ---------- backdrop ---------- */

const Backdrop: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(160deg, #0A2A6B 0%, #1446A0 55%, #0B2F78 100%)" }} />
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 40px)",
          backgroundPosition: `${frame * 0.6}px 0px`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 42%, rgba(255,255,255,0.16) 0%, transparent 55%), radial-gradient(ellipse at center, transparent 55%, rgba(3,10,35,0.55) 100%)",
        }}
      />
      {/* Film grain */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.07, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 12} />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/* ---------- building blocks ---------- */

type Placed = {
  at: number; // frame, relative to the scene
  name: string;
  x?: number; // offset from frame center
  y?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

const anchor = (x: number, y: number): React.CSSProperties => ({
  position: "absolute",
  left: 960 + x,
  top: 540 + y,
});

// Soft entrance: fade, small rise and settle.
const Enter: React.FC<Placed> = ({ at, name, x = 0, y = 0, style, children }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ ...anchor(x, y), translate: "-50% -50%" }}>
      <Interactive.Div
        name={name}
        style={{
          filter: SHADOW,
          ...style,
          opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
          translate: interpolate(frame, [at, at + 18], ["0px 36px", "0px 0px"], { ...clamp, easing: outExpo }),
          scale: interpolate(frame, [at, at + 18], [0.86, 1], { ...clamp, easing: outExpo, output: "perceptual-scale" }),
        }}
      >
        {children}
      </Interactive.Div>
    </div>
  );
};

// Punchy entrance for verdicts (check, X, ban): drops in from large.
const Stamp: React.FC<Placed> = ({ at, name, x = 0, y = 0, style, children }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
        ...anchor(x, y),
        translate: "-50% -50%",
        filter: SHADOW,
        ...style,
        opacity: interpolate(frame, [at, at + 4], [0, 1], clamp),
        scale: interpolate(frame, [at, at + 14], [1.8, 1], {
          ...clamp,
          easing: Easing.spring({ damping: 12 }),
          output: "perceptual-scale",
        }),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

// Fades a group out (and lets it drift) between two frames.
const Exit: React.FC<{ from: number; to: number; dx?: number; children: React.ReactNode }> = ({
  from,
  to,
  dx = 0,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [from, to], [1, 0], clamp),
        translate: interpolate(frame, [from, to], ["0px 0px", `${dx}px 0px`], { ...clamp, easing: inOut }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const IconBadge: React.FC<{ Icon: LucideIcon; size: number; color?: string; ring?: string }> = ({
  Icon,
  size,
  color = WHITE,
  ring = GLASS_EDGE,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: GLASS,
      border: `4px solid ${ring}`,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Icon size={size * 0.56} color={color} strokeWidth={1.6} />
  </div>
);

const Verdict: React.FC<{ ok: boolean; size: number }> = ({ ok, size }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: ok ? YELLOW : RED,
      border: `${size * 0.05}px solid ${WHITE}`,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    {ok ? (
      <Check size={size * 0.62} color={NAVY} strokeWidth={3.4} />
    ) : (
      <X size={size * 0.62} color={WHITE} strokeWidth={3.4} />
    )}
  </div>
);

// Paper ballot slip with a preference number.
const Slip: React.FC<{ kind: "white" | "green"; n?: number; width?: number; checkAt?: number }> = ({
  kind,
  n,
  width = 260,
  checkAt,
}) => {
  const frame = useCurrentFrame();
  const paper =
    kind === "white" ? "linear-gradient(170deg, #FFFFFF 0%, #E9EDF5 100%)" : "linear-gradient(170deg, #45DE77 0%, #22A84E 100%)";
  return (
    <div
      style={{
        position: "relative",
        width,
        height: width * 1.3,
        borderRadius: width * 0.05,
        background: paper,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: width * 0.08,
        boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.06)",
      }}
    >
      {[0.6, 0.45, 0.3].map((w) => (
        <div key={w} style={{ width: width * w, height: width * 0.07, borderRadius: 99, backgroundColor: "rgba(11,27,63,0.2)" }} />
      ))}
      {n ? (
        <div
          style={{
            position: "absolute",
            top: -width * 0.16,
            right: -width * 0.16,
            width: width * 0.4,
            height: width * 0.4,
            borderRadius: "50%",
            backgroundColor: NAVY,
            border: `${width * 0.025}px solid ${WHITE}`,
            color: WHITE,
            fontFamily,
            fontWeight: 900,
            fontSize: width * 0.26,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {n}
        </div>
      ) : null}
      {checkAt !== undefined ? (
        <svg viewBox="0 0 100 100" style={{ position: "absolute", width: width * 0.8, height: width * 0.8, overflow: "visible" }}>
          <path
            d="M15 55 L40 78 L88 22"
            fill="none"
            stroke={NAVY}
            strokeWidth={11}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={interpolate(frame, [checkAt, checkAt + 14], [1, 0], { ...clamp, easing: outExpo })}
          />
        </svg>
      ) : null}
    </div>
  );
};

/* ---------- persistent ballot slips (3.0s – 17.8s) ---------- */

type Key = [sec: number, x: number, y: number, scale: number, opacity: number];

const track = (frame: number, keys: Key[]) => {
  const t = keys.map((k) => s(k[0]));
  const opt = { ...clamp, easing: inOut };
  return {
    left: interpolate(frame, t, keys.map((k) => k[1]), opt),
    top: interpolate(frame, t, keys.map((k) => k[2]), opt),
    scale: interpolate(frame, t, keys.map((k) => k[3]), { ...opt, output: "perceptual-scale" }),
    opacity: interpolate(frame, t, keys.map((k) => k[4]), clamp),
  };
};

// Chart geometry shared by the slips and the threshold scene.
const CHART = { baseline: 900, threshold: 260, left: 440, right: 1480, bar: 220 };
const PARTY_X = { first: 1160, second: 760 }; // first choice on the right (RTL)

const WHITE_SLIP: Key[] = [
  [3.1, 960, 540, 0.6, 0], // "במקום להצביע למפלגה אחת"
  [3.6, 960, 540, 1, 1],
  [4.8, 960, 540, 1, 1], // "לשתי מפלגות" — split
  [5.3, 1180, 540, 1, 1],
  [5.4, 1180, 540, 1, 1], // "בפתק לבן"
  [6.0, 960, 520, 1.3, 1],
  [8.0, 960, 520, 1.3, 1], // "ובעוד פתק"
  [8.6, 1240, 540, 1, 1],
  [11.2, 1240, 540, 1, 1], // chart: park top-right
  [11.6, 1660, 320, 0.55, 1],
  [12.0, 1660, 320, 0.55, 1], // "את אחוז החסימה" — into party 1
  [12.6, PARTY_X.first, 760, 0.25, 1],
  [12.8, PARTY_X.first, 760, 0.25, 0],
  [14.4, 1660, 320, 0.55, 0], // second round
  [14.6, 1660, 320, 0.55, 1],
  [14.9, 1660, 320, 0.55, 1],
  [15.4, PARTY_X.first, 800, 0.25, 1],
  [15.6, PARTY_X.first, 800, 0.25, 0],
];

const GREEN_SLIP: Key[] = [
  [4.8, 960, 540, 0.9, 0],
  [5.3, 740, 540, 1, 1],
  [5.4, 740, 540, 1, 1],
  [5.9, 700, 560, 0.8, 0], // white gets the spotlight
  [9.0, 280, 540, 1, 0], // "נניח ירוק"
  [9.6, 680, 540, 1, 1],
  [11.2, 680, 540, 1, 1], // chart: wait as the backup, top-left
  [11.6, 260, 320, 0.55, 1],
  [16.2, 260, 320, 0.55, 1], // "פשוט לוקחים" — into party 2
  [16.9, PARTY_X.second, 600, 0.25, 1],
  [17.1, PARTY_X.second, 600, 0.25, 0],
];

const SlipLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const slip = (name: string, keys: Key[], child: React.ReactNode) => {
    const p = track(frame, keys);
    return (
      <Interactive.Div
        name={name}
        style={{ position: "absolute", left: p.left, top: p.top, translate: "-50% -50%", scale: p.scale, opacity: p.opacity, filter: SHADOW }}
      >
        {child}
      </Interactive.Div>
    );
  };
  return (
    <AbsoluteFill>
      {slip("Green slip", GREEN_SLIP, <Slip kind="green" n={2} checkAt={s(10.2)} />)}
      {slip("White slip", WHITE_SLIP, <Slip kind="white" n={1} checkAt={s(7.2)} />)}
    </AbsoluteFill>
  );
};

/* ---------- scenes (cue times are absolute seconds) ---------- */

type SceneProps = { start: number; end: number };
const cue = (start: number) => (sec: number) => s(sec) - s(start);

const SceneWrap: React.FC<SceneProps & { children: React.ReactNode; fadeOut?: boolean }> = ({
  start,
  end,
  children,
  fadeOut = true,
}) => {
  const frame = useCurrentFrame();
  const len = s(end) - s(start);
  return (
    <AbsoluteFill style={{ opacity: fadeOut ? interpolate(frame, [len - 8, len], [1, 0], clamp) : 1 }}>{children}</AbsoluteFill>
  );
};

// "I have an idea that fixes one of the most annoying problems in Israel's election system."
const Idea: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  return (
    <SceneWrap {...p}>
      <Enter at={c(0.4)} name="Idea" x={-300}>
        <div
          style={{
            position: "absolute",
            inset: -90,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${YELLOW} 0%, transparent 62%)`,
            opacity: 0.35 + 0.12 * Math.sin(frame / 6),
          }}
        />
        <IconBadge Icon={Lightbulb} size={330} color={YELLOW} ring={YELLOW} />
      </Enter>
      <Enter at={c(1.8)} name="Election system" x={300}>
        <IconBadge Icon={Vote} size={330} />
      </Enter>
      <Stamp at={c(2.4)} name="Fix" x={450} y={-150}>
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            backgroundColor: YELLOW,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            rotate: `${Math.sin(frame / 4) * 18}deg`,
          }}
        >
          <Wrench size={80} color={NAVY} strokeWidth={2.4} />
        </div>
      </Stamp>
    </SceneWrap>
  );
};

const Bar: React.FC<{ name: string; x: number; color: string; height: number }> = ({ name, x, color, height }) => (
  <Interactive.Div
    name={name}
    style={{
      position: "absolute",
      left: x - CHART.bar / 2,
      top: CHART.baseline - height,
      width: CHART.bar,
      height,
      borderRadius: "22px 22px 0 0",
      background: color,
      filter: SHADOW,
    }}
  />
);

// "If the first party passes the threshold…" / "…but if it doesn't, the green slip counts."
const ThresholdChart: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  const width = interpolate(frame, [0, 16], [0, CHART.right - CHART.left], { ...clamp, easing: outExpo });
  const first = interpolate(frame, [c(12.2), c(13.0), c(14.2), c(14.5), c(15.0), c(15.6)], [0, 420, 420, 0, 0, 170], {
    ...clamp,
    easing: outExpo,
  });
  const second = interpolate(frame, [c(14.5), c(15.0)], [0, 360], { ...clamp, easing: outExpo });
  return (
    <SceneWrap {...p}>
      <div style={{ position: "absolute", left: CHART.left, top: CHART.baseline, width, height: 10, borderRadius: 5, backgroundColor: WHITE }} />
      <div
        style={{
          position: "absolute",
          left: CHART.left,
          top: CHART.baseline - CHART.threshold,
          width,
          borderTop: `8px dashed ${YELLOW}`,
        }}
      />
      <Enter at={c(12.0)} name="Threshold label" x={CHART.right - 960 + 30} y={CHART.baseline - CHART.threshold - 540}>
        <div
          style={{
            backgroundColor: YELLOW,
            color: NAVY,
            fontFamily,
            fontWeight: 900,
            fontSize: 56,
            padding: "6px 22px",
            borderRadius: 16,
            direction: "ltr",
          }}
        >
          3.25%
        </div>
      </Enter>
      <Bar name="Party 2" x={PARTY_X.second} color={`linear-gradient(180deg, #45DE77, #22A84E)`} height={second} />
      <Bar name="Party 1" x={PARTY_X.first} color="linear-gradient(180deg, #FFFFFF, #DDE3EE)" height={first} />
      <Exit from={c(14.2)} to={c(14.4)}>
        <Stamp at={c(13.4)} name="Passed" x={PARTY_X.first - 960} y={CHART.baseline - 420 - 110 - 540}>
          <Verdict ok size={150} />
        </Stamp>
      </Exit>
      <Stamp at={c(15.5)} name="Didn't pass" x={PARTY_X.first - 960} y={CHART.baseline - 170 - 100 - 540}>
        <Verdict ok={false} size={150} />
      </Stamp>
      <Stamp at={c(17.0)} name="Backup counted" x={PARTY_X.second - 960} y={CHART.baseline - 360 - 110 - 540}>
        <Verdict ok size={150} />
      </Stamp>
    </SceneWrap>
  );
};

// "That gets us two things:"
const TwoThings: React.FC<SceneProps> = (p) => {
  const c = cue(p.start);
  return (
    <SceneWrap {...p}>
      {[1, 2].map((n, i) => (
        <Enter key={n} at={c(17.8) + i * 5} name={`Thing ${n}`} x={i === 0 ? 170 : -170}>
          <div
            style={{
              width: 280,
              height: 340,
              borderRadius: 36,
              backgroundColor: GLASS,
              border: `4px solid ${n === 1 ? YELLOW : GLASS_EDGE}`,
              color: WHITE,
              fontFamily,
              fontWeight: 900,
              fontSize: 200,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {n}
          </div>
        </Enter>
      ))}
    </SceneWrap>
  );
};

// "First: hundreds of thousands of votes won't be thrown in the trash, like in recent elections."
const NoWastedVotes: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  const drops = [-130, 70, -30, 140, -90, 20];
  // Meretz (150,696) + Balad (138,617), both below the threshold in 2022.
  const WASTED_2022 = 289313;
  const count = Math.round(interpolate(frame, [c(21.6), c(22.5)], [0, WASTED_2022], { ...clamp, easing: outExpo }));
  return (
    <SceneWrap {...p}>
      <AbsoluteFill
        style={{ translate: interpolate(frame, [c(21.3), c(21.7)], ["0px 0px", "-380px 0px"], { ...clamp, easing: inOut }) }}
      >
        {drops.map((dx, i) => {
          const at = c(19.4) + i * 5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 960 + dx,
                top: interpolate(frame, [at, at + 14], [-160, 560], { ...clamp, easing: Easing.in(Easing.quad) }),
                translate: "-50% -50%",
                rotate: `${(i % 2 ? 1 : -1) * (14 + i * 5)}deg`,
                opacity: interpolate(frame, [at + 11, at + 15], [1, 0], clamp),
                filter: SHADOW,
              }}
            >
              <Slip kind={i % 3 === 0 ? "green" : "white"} width={100} />
            </div>
          );
        })}
        <Enter at={c(18.8)} name="Trash" y={130}>
          <IconBadge Icon={Trash2} size={330} />
        </Enter>
        <Stamp at={c(20.4)} name="No more" y={130}>
          <Ban size={420} color={RED} strokeWidth={2.2} />
        </Stamp>
      </AbsoluteFill>
      <Enter at={c(21.6)} name="Wasted votes 2022" x={330} y={30}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div
            style={{
              backgroundColor: GLASS,
              border: `3px solid ${GLASS_EDGE}`,
              color: WHITE,
              fontFamily,
              fontWeight: 500,
              fontSize: 52,
              padding: "4px 26px",
              borderRadius: 999,
            }}
          >
            2022
          </div>
          <div style={{ color: WHITE, fontFamily, fontWeight: 900, fontSize: 170, direction: "ltr", lineHeight: 1 }}>
            {count.toLocaleString("en-US")}
          </div>
        </div>
      </Enter>
    </SceneWrap>
  );
};

// "Second: no more strategic voting — if your first party fails, you have a backup vote."
const NoGambling: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  return (
    <SceneWrap {...p}>
      <Exit from={c(25.4)} to={c(25.8)} dx={-200}>
        <Enter at={c(23.6)} name="Gambling">
          <IconBadge Icon={Dices} size={360} />
        </Enter>
        <Stamp at={c(24.6)} name="No gambling" x={130} y={-130}>
          <Verdict ok={false} size={160} />
        </Stamp>
      </Exit>
      <Enter at={c(26.0)} name="First failed" x={-380}>
        <div style={{ position: "relative" }}>
          <Slip kind="white" n={1} width={210} />
          <div style={{ position: "absolute", bottom: -40, left: -40 }}>
            <Verdict ok={false} size={110} />
          </div>
        </div>
      </Enter>
      <Enter at={c(27.3)} name="Backup" x={40}>
        <IconBadge Icon={LifeBuoy} size={330} color={YELLOW} ring={YELLOW} />
      </Enter>
      <Enter at={c(27.4)} name="Green slip" x={420}>
        <div style={{ position: "relative", rotate: `${6 + Math.sin(frame / 10) * 3}deg` }}>
          <Slip kind="green" n={2} width={210} />
          <div style={{ position: "absolute", bottom: -40, left: -40 }}>
            <Verdict ok size={110} />
          </div>
        </div>
      </Enter>
    </SceneWrap>
  );
};

// "…without mini-parties that would hurt stability if we lowered the threshold."
const Stability: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  const minis = [90, 140, 60, 120, 80, 150, 70, 110, 95, 130, 65, 105];
  const wobble = interpolate(frame, [c(29.6), c(30.2)], [2, 10], clamp);
  return (
    <SceneWrap {...p}>
      {minis.map((h, i) => {
        const at = c(28.6) + i * 2;
        return (
          <Interactive.Div
            key={i}
            name={`Mini party ${i + 1}`}
            style={{
              position: "absolute",
              left: 255 + i * 120,
              top: 780 - h * 2,
              width: 90,
              height: interpolate(frame, [at, at + 10], [0, h * 2], { ...clamp, easing: outExpo }),
              borderRadius: "18px 18px 0 0",
              backgroundColor: i % 4 === 1 ? YELLOW : `rgba(255,255,255,${0.55 + (i % 3) * 0.18})`,
              filter: SHADOW,
              translate: `0px ${Math.sin(frame / 2 + i) * wobble}px`,
            }}
          />
        );
      })}
      <Stamp at={c(30.2)} name="No mini parties" y={90}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: 1560, height: 420, display: "block" }}>
          <path d="M3 6 L97 94 M97 6 L3 94" stroke={RED} strokeWidth={26} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </Stamp>
    </SceneWrap>
  );
};

// "Elections became a reality show — this gives some power back to the people."
const PowerToPeople: React.FC<SceneProps> = (p) => {
  const frame = useCurrentFrame();
  const c = cue(p.start);
  const crowd = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <SceneWrap {...p}>
      <Exit from={c(34.3)} to={c(34.6)}>
        <Enter at={c(33.2)} name="Elections">
          <IconBadge Icon={Vote} size={340} />
        </Enter>
      </Exit>
      <Exit from={c(35.7)} to={c(36.0)}>
        <Enter at={c(34.6)} name="Reality TV" x={-90}>
          <IconBadge Icon={Tv} size={360} />
        </Enter>
        <Enter at={c(35.0)} name="Popcorn" x={230} y={110}>
          <IconBadge Icon={Popcorn} size={200} color={YELLOW} ring={YELLOW} />
        </Enter>
      </Exit>
      {crowd.map((d, i) => (
        <Enter key={d} at={c(36.2) + i * 2} name={`Citizen ${d}`} x={d * 180} y={250}>
          <Person color={i % 2 ? "rgba(255,255,255,0.8)" : WHITE} size={1.1} />
        </Enter>
      ))}
      <Enter at={c(37.8)} name="Ballot in their hands" y={-150}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              inset: -120,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${YELLOW} 0%, transparent 62%)`,
              opacity: 0.4 + 0.12 * Math.sin(frame / 6),
            }}
          />
          <Slip kind="white" width={200} checkAt={c(38.0)} />
        </div>
      </Enter>
    </SceneWrap>
  );
};

// "So what do you think?"
const WhatDoYouThink: React.FC<SceneProps> = (p) => {
  const c = cue(p.start);
  return (
    <SceneWrap {...p} fadeOut={false}>
      <Enter at={c(38.8)} name="Question">
        <IconBadge Icon={MessageCircleQuestion} size={400} color={YELLOW} ring={YELLOW} />
      </Enter>
    </SceneWrap>
  );
};

const SCENE_COMPONENTS: React.FC<SceneProps>[] = [
  Idea,
  ThresholdChart,
  TwoThings,
  NoWastedVotes,
  NoGambling,
  Stability,
  PowerToPeople,
  WhatDoYouThink,
];

/* ---------- compositions ---------- */

export const BallotCard: React.FC<{ backdrop?: boolean }> = ({ backdrop = true }) => (
  <AbsoluteFill style={{ fontFamily, direction: "rtl", overflow: "hidden" }}>
    {backdrop ? <Backdrop /> : null}
    {SCENES.map((scene, i) => {
      const Component = SCENE_COMPONENTS[i];
      return (
        <Sequence key={scene.name} name={scene.name} from={s(scene.from)} durationInFrames={s(scene.to) - s(scene.from)}>
          <Component start={scene.from} end={scene.to} />
        </Sequence>
      );
    })}
    <Sequence name="Ballot slips" from={0} durationInFrames={s(17.8)}>
      <SlipLayer />
    </Sequence>
  </AbsoluteFill>
);

// Final vertical video: the footage with the graphics card over its lower part.
// The card starts just below the burned-in captions so it also hides the
// footage's previous graphics; the 16:9 scene is centered in the taller card.
const OUT_W = 1080;
const OUT_H = 1920;
const CARD_TOP = 1240;
const CARD_SCALE = OUT_W / WIDTH;
const CARD_CANVAS_H = (OUT_H - CARD_TOP) / CARD_SCALE;

export const BallotFinal: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
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
        borderRadius: "56px 56px 0 0",
        overflow: "hidden",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.45)",
        borderTop: `8px solid ${YELLOW}`,
      }}
    >
      <Backdrop />
      <div style={{ position: "absolute", left: 0, top: (CARD_CANVAS_H - HEIGHT) / 2, width: WIDTH, height: HEIGHT }}>
        <BallotCard backdrop={false} />
      </div>
    </div>
  </AbsoluteFill>
);

export const BallotV2Composition = () => (
  <>
    <Composition id="TwoBallotsV2Card" component={BallotCard} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition id="TwoBallotsV2Final" component={BallotFinal} durationInFrames={DURATION} fps={FPS} width={OUT_W} height={OUT_H} />
  </>
);
