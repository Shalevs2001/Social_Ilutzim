import { AbsoluteFill, Composition, Interactive, interpolate, Sequence, useCurrentFrame } from "remotion";
import { fontFamily } from "./fonts";
import {
  BLUE,
  clamp,
  Emoji,
  FPS,
  HEIGHT,
  inOut,
  NAVY,
  outExpo,
  Person,
  Pop,
  PREVIEW_H,
  PREVIEW_W,
  RED,
  Scene,
  isChroma,
  KEY_GREEN,
  setChromaMode,
  shadow,
  VerticalPreview,
  WHITE,
  WIDTH,
  YELLOW,
} from "./IranVideo";

// "Two ballots" election-reform pitch: illustrations only, transparent 16:9.
// The "green slip" turns a deeper green on the green-screen version so it isn't keyed out.
const green = () => (isChroma() ? "#127A55" : "#2DC653");

// Scene lengths follow the script's word count (~3.4 words/sec, 40s total).
const SCENES = [
  { name: "Idea", frames: 114 },
  { name: "One to two", frames: 62 },
  { name: "White slip", frames: 80 },
  { name: "Green slip", frames: 80 },
  { name: "First passes", frames: 106 },
  { name: "First fails", frames: 116 },
  { name: "Two wins", frames: 36 },
  { name: "No wasted votes", frames: 122 },
  { name: "No strategic voting", frames: 172 },
  { name: "Stability", frames: 130 },
  { name: "Power to the people", frames: 146 },
  { name: "What do you think", frames: 36 },
];
const DURATION = SCENES.reduce((sum, s) => sum + s.frames, 0);

/* ---------- building blocks ---------- */

const Slip: React.FC<{ color: string; n?: number; width?: number; check?: number }> = ({
  color,
  n,
  width = 260,
  check,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "relative",
        width,
        height: width * 1.3,
        borderRadius: width * 0.06,
        backgroundColor: color,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: width * 0.08,
        boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.08)",
      }}
    >
      {[0.6, 0.45, 0.3].map((w) => (
        <div
          key={w}
          style={{ width: width * w, height: width * 0.08, borderRadius: 99, backgroundColor: "rgba(11,20,38,0.25)" }}
        />
      ))}
      {n ? (
        <div
          style={{
            position: "absolute",
            top: -width * 0.18,
            right: -width * 0.18,
            width: width * 0.42,
            height: width * 0.42,
            borderRadius: "50%",
            backgroundColor: NAVY,
            border: `${width * 0.03}px solid ${WHITE}`,
            color: WHITE,
            fontFamily,
            fontWeight: 900,
            fontSize: width * 0.28,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {n}
        </div>
      ) : null}
      {check !== undefined ? (
        <svg viewBox="0 0 100 100" style={{ position: "absolute", width: width * 0.8, height: width * 0.8, overflow: "visible" }}>
          <path
            d="M15 55 L40 78 L88 22"
            fill="none"
            stroke={NAVY}
            strokeWidth={12}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={interpolate(frame, [check, check + 18], [1, 0], { ...clamp, easing: outExpo })}
          />
        </svg>
      ) : null}
    </div>
  );
};

// A slip that flies along a path (absolute frame coordinates, center-based).
const FlyingSlip: React.FC<{
  name: string;
  color: string;
  n?: number;
  keys: number[];
  xs: number[];
  ys: number[];
  scales: number[];
  opacity?: number[];
}> = ({ name, color, n, keys, xs, ys, scales, opacity }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: interpolate(frame, keys, xs, { ...clamp, easing: inOut }),
        top: interpolate(frame, keys, ys, { ...clamp, easing: inOut }),
        translate: "-50% -50%",
        filter: shadow(),
        opacity: opacity ? interpolate(frame, keys, opacity, clamp) : 1,
        scale: interpolate(frame, keys, scales, { ...clamp, easing: inOut, output: "perceptual-scale" }),
      }}
    >
      <Slip color={color} n={n} />
    </Interactive.Div>
  );
};

// Threshold chart: two party bars and a dashed blocking-threshold line.
const CHART = { baseline: 900, threshold: 260, left: 460, right: 1460, bar: 220 };
const BAR_X = [1160, 760]; // party 1 (right, first in RTL), party 2 (bar centers)

const ChartFrame: React.FC = () => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, 15], [0, CHART.right - CHART.left], { ...clamp, easing: outExpo });
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: CHART.left,
          top: CHART.baseline,
          width,
          height: 12,
          borderRadius: 6,
          backgroundColor: WHITE,
          filter: shadow(),
        }}
      />
      <Interactive.Div
        name="Threshold"
        style={{
          position: "absolute",
          left: CHART.left,
          top: CHART.baseline - CHART.threshold,
          width,
          borderTop: `10px dashed ${YELLOW}`,
          filter: shadow(),
        }}
      />
    </>
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
      borderRadius: "24px 24px 0 0",
      backgroundColor: color,
      filter: shadow(),
    }}
  />
);

const CrossOut: React.FC<{ at: number; size: number }> = ({ at, size }) => {
  const frame = useCurrentFrame();
  return (
    <svg
      viewBox="0 0 100 100"
      style={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", width: size, height: size, overflow: "visible" }}
    >
      <path
        d="M10 10 L90 90 M90 10 L10 90"
        stroke={RED}
        strokeWidth={10}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={interpolate(frame, [at, at + 16], [1, 0], clamp)}
      />
    </svg>
  );
};

// Yellow check badge (instead of the green ✅ emoji, which a green screen would key out).
const CheckBadge: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 100 100" style={{ width: size, height: size, display: "block" }}>
    <circle cx={50} cy={50} r={46} fill={YELLOW} stroke={WHITE} strokeWidth={5} />
    <path d="M27 52 L44 68 L74 34" fill="none" stroke={NAVY} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ---------- scenes ---------- */

// "I have an idea that fixes one of the most annoying problems in our system."
const Idea: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Pop at={0} name="Ballot" x={220} y={60}>
        <Emoji name="ballot" size={400} />
      </Pop>
      <Pop at={18} name="Bulb" x={-320} y={-80}>
        <div
          style={{
            position: "absolute",
            inset: -120,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${YELLOW} 0%, transparent 65%)`,
            opacity: isChroma() ? 0 : 0.45 + 0.2 * Math.sin(frame / 5),
          }}
        />
        <Emoji name="bulb" size={320} />
      </Pop>
      <Pop at={55} name="Wrench" x={480} y={-200}>
        <Interactive.Div name="Wrench turn" style={{ rotate: `${Math.sin(frame / 4) * 25}deg` }}>
          <Emoji name="wrench" size={220} />
        </Interactive.Div>
      </Pop>
    </Scene>
  );
};

// "Instead of voting for one party — vote for two."
const OneToTwo: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <FlyingSlip
      name="Green slip"
      color={green()}
      keys={[18, 40]}
      xs={[960, 700]}
      ys={[540, 540]}
      scales={[0.9, 1]}
      opacity={[0, 1]}
    />
    <FlyingSlip name="White slip" color={WHITE} keys={[0, 14, 18, 40]} xs={[960, 960, 960, 1220]} ys={[540, 540, 540, 540]} scales={[0, 1, 1, 1]} />
  </Scene>
);

// "A white slip, like today — for your first choice."
const WhiteSlip: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Pop at={0} name="White slip">
      <Slip color={WHITE} n={1} width={340} check={25} />
    </Pop>
  </Scene>
);

// "And another — say green — for your second choice."
const GreenSlip: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Interactive.Div
        name="White slip"
        style={{
          position: "absolute",
          left: interpolate(frame, [0, 20], [960, 1280], { ...clamp, easing: inOut }),
          top: 540,
          translate: "-50% -50%",
          filter: shadow(),
          scale: interpolate(frame, [0, 20], [1, 0.8], { ...clamp, easing: inOut, output: "perceptual-scale" }),
        }}
      >
        <Slip color={WHITE} n={1} width={340} check={-100} />
      </Interactive.Div>
      <Interactive.Div
        name="Green slip"
        style={{
          position: "absolute",
          left: interpolate(frame, [12, 36], [60, 640], { ...clamp, easing: outExpo }),
          top: 540,
          translate: "-50% -50%",
          filter: shadow(),
          opacity: interpolate(frame, [12, 20], [0, 1], clamp),
        }}
      >
        <Slip color={green()} n={2} width={340} check={42} />
      </Interactive.Div>
    </Scene>
  );
};

// "If your first party passes the threshold — your vote goes to it as usual."
const FirstPasses: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <ChartFrame />
      <Bar name="Party 1" x={BAR_X[0]} color={WHITE} height={interpolate(frame, [38, 70], [0, 420], { ...clamp, easing: outExpo })} />
      <FlyingSlip
        name="White slip"
        color={WHITE}
        n={1}
        keys={[4, 16, 40, 48]}
        xs={[1650, 1650, BAR_X[0], BAR_X[0]]}
        ys={[400, 400, 760, 820]}
        scales={[0, 0.7, 0.4, 0.2]}
        opacity={[1, 1, 1, 0]}
      />
      <Pop at={74} name="Passed" x={BAR_X[0] - 960} y={-180}>
        <CheckBadge size={190} />
      </Pop>
    </Scene>
  );
};

// "But if it didn't pass — the green slip counts instead."
const FirstFails: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <ChartFrame />
      <Bar name="Party 1" x={BAR_X[0]} color={WHITE} height={interpolate(frame, [10, 40], [0, 170], { ...clamp, easing: outExpo })} />
      <Bar name="Party 2" x={BAR_X[1]} color={green()} height={interpolate(frame, [10, 40], [0, 360], { ...clamp, easing: outExpo })} />
      <Pop at={44} name="Failed" x={BAR_X[0] - 960} y={60}>
        <Emoji name="cross" size={170} />
      </Pop>
      <FlyingSlip
        name="Green slip"
        color={green()}
        n={2}
        keys={[52, 62, 88, 96]}
        xs={[1700, 1700, BAR_X[1], BAR_X[1]]}
        ys={[320, 320, 520, 580]}
        scales={[0, 0.7, 0.4, 0.2]}
        opacity={[1, 1, 1, 0]}
      />
      <Pop at={96} name="Counted" x={BAR_X[1] - 960} y={-250}>
        <CheckBadge size={190} />
      </Pop>
    </Scene>
  );
};

// "That gets us two things:"
const TwoWins: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Pop at={0} name="Two">
      <Emoji name="victory" size={380} />
    </Pop>
  </Scene>
);

// "First: no more hundreds of thousands of votes thrown in the trash."
const NoWastedVotes: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const drops = [
    { x: -150, at: 6 },
    { x: 90, at: 14 },
    { x: -40, at: 22 },
    { x: 160, at: 30 },
    { x: -120, at: 38 },
    { x: 30, at: 46 },
    { x: 120, at: 54 },
  ];
  return (
    <Scene frames={frames}>
      {drops.map((d, i) => (
        <Interactive.Div
          key={i}
          name={`Vote ${i + 1}`}
          style={{
            position: "absolute",
            left: 960 + d.x,
            top: interpolate(frame, [d.at, d.at + 22], [-180, 560], { ...clamp, easing: Easing2 }),
            translate: "-50% -50%",
            rotate: `${(i % 2 ? 1 : -1) * (15 + i * 4)}deg`,
            filter: shadow(),
            opacity: interpolate(frame, [d.at + 18, d.at + 24], [1, 0], clamp),
          }}
        >
          <Slip color={i % 3 === 0 ? green() : WHITE} width={110} />
        </Interactive.Div>
      ))}
      <Pop at={0} name="Trash" y={200}>
        <Emoji name="trash" size={340} />
      </Pop>
      <Pop at={84} name="No more" y={100}>
        <Emoji name="prohibited" size={520} />
      </Pop>
    </Scene>
  );
};
const Easing2 = (t: number) => t * t; // gravity-ish fall

// "Second: no need to vote 'strategically' — you have a backup vote."
const NoStrategic: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Pop at={0} name="Strategy" x={-420}>
        <Emoji name="pawn" size={320} />
        <CrossOut at={35} size={380} />
      </Pop>
      <Pop at={80} name="Backup" x={260} y={40}>
        <Emoji name="buoy" size={320} />
      </Pop>
      <Pop at={95} name="Green slip" x={560} y={60}>
        <div style={{ rotate: `${8 + Math.sin(frame / 10) * 4}deg` }}>
          <Slip color={green()} n={2} width={200} />
        </div>
      </Pop>
      <Pop at={130} name="Covered" x={420} y={-300}>
        <CheckBadge size={170} />
      </Pop>
    </Scene>
  );
};

// "All without tiny parties that would hurt stability."
const Stability: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const minis = [90, 140, 60, 120, 80, 150, 70, 110, 95, 130, 65, 105];
  const colors = [RED, BLUE, YELLOW, green(), WHITE];
  return (
    <Scene frames={frames}>
      <AbsoluteFill
        style={{
          opacity: interpolate(frame, [50, 66], [1, 0], clamp),
          translate: interpolate(frame, [50, 66], ["0px 0px", "0px 120px"], { ...clamp, easing: inOut }),
        }}
      >
        {minis.map((h, i) => (
          <Interactive.Div
            key={i}
            name={`Mini party ${i + 1}`}
            style={{
              position: "absolute",
              left: 400 + i * 95,
              top: 800 - h,
              width: 70,
              height: interpolate(frame, [i * 3, i * 3 + 12], [0, h], { ...clamp, easing: outExpo }),
              borderRadius: "14px 14px 0 0",
              backgroundColor: colors[i % colors.length],
              filter: shadow(),
              translate: `0px ${Math.sin(frame / 2 + i) * 8}px`,
            }}
          />
        ))}
      </AbsoluteFill>
      <Pop at={68} name="Stable" y={20}>
        <Emoji name="capitol" size={420} />
      </Pop>
      <Pop at={98} name="Stable check" x={300} y={-220}>
        <CheckBadge size={170} />
      </Pop>
    </Scene>
  );
};

// "Elections became a reality show — this gives power back to the people."
const PowerToPeople: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const crowd = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <Scene frames={frames}>
      <AbsoluteFill style={{ opacity: interpolate(frame, [62, 72], [1, 0], clamp) }}>
        <Pop at={0} name="TV" x={-120}>
          <Emoji name="tv" size={400} />
        </Pop>
        <Pop at={14} name="Popcorn" x={260} y={120}>
          <Emoji name="popcorn" size={240} />
        </Pop>
      </AbsoluteFill>
      {crowd.map((d, i) => (
        <Pop key={d} at={74 + i * 3} name={`Citizen ${d}`} x={d * 190} y={200}>
          <Person color={BLUE} size={1.2} />
        </Pop>
      ))}
      <Pop at={96} name="Fist" y={-180}>
        <div style={{ translate: `0px ${Math.sin(frame / 6) * 14}px` }}>
          <Emoji name="fist" size={300} />
        </div>
      </Pop>
    </Scene>
  );
};

// "So what do you think?"
const WhatDoYouThink: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Pop at={0} name="Speech">
      <Emoji name="speech" size={460} />
    </Pop>
    <Pop at={6} name="Thinking" x={0} y={-30}>
      <Emoji name="thinking" size={200} />
    </Pop>
  </Scene>
);

const SCENE_COMPONENTS: React.FC<{ frames: number }>[] = [
  Idea,
  OneToTwo,
  WhiteSlip,
  GreenSlip,
  FirstPasses,
  FirstFails,
  TwoWins,
  NoWastedVotes,
  NoStrategic,
  Stability,
  PowerToPeople,
  WhatDoYouThink,
];

/* ---------- main ---------- */

export const BallotGraphics: React.FC<{ chroma?: boolean }> = ({ chroma = false }) => {
  setChromaMode(chroma);
  let from = 0;
  return (
    <AbsoluteFill style={{ fontFamily, direction: "rtl", backgroundColor: chroma ? KEY_GREEN : undefined }}>
      {SCENES.map((scene, i) => {
        const Component = SCENE_COMPONENTS[i];
        const start = from;
        from += scene.frames;
        return (
          <Sequence key={scene.name} name={scene.name} from={start} durationInFrames={scene.frames}>
            <Component frames={scene.frames} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const BallotPreview: React.FC = () => (
  <VerticalPreview>
    <BallotGraphics />
  </VerticalPreview>
);

export const BallotComposition = () => (
  <>
    <Composition id="TwoBallots" component={BallotGraphics} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
    <Composition
      id="TwoBallotsGreen"
      component={BallotGraphics}
      defaultProps={{ chroma: true }}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="TwoBallotsPreview"
      component={BallotPreview}
      durationInFrames={DURATION}
      fps={FPS}
      width={PREVIEW_W}
      height={PREVIEW_H}
    />
  </>
);
