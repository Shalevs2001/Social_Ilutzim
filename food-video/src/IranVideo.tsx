import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Interactive,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "./fonts";

// Illustrations only (no captions) on a transparent 16:9 frame, meant to be
// placed over the lower part of a vertical talking-head video.
const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const NAVY = "#0B1426";
const RED = "#E63946";
const YELLOW = "#FFD60A";
const BLUE = "#4EA8DE";
const WHITE = "#FFFFFF";
const GRAY = "#C9D1DE";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
const outExpo = Easing.bezier(0.16, 1, 0.3, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);
// Keeps graphics readable on top of any footage.
const SHADOW = "drop-shadow(0 10px 24px rgba(0,0,0,0.45))";

// Scene lengths follow the script's word count (~3.5 words/sec, 48s total).
const SCENES = [
  { name: "Hook", frames: 60 },
  { name: "Maybe", frames: 84 },
  { name: "Here's why", frames: 66 },
  { name: "Reason 1", frames: 177 },
  { name: "Reason 2", frames: 243 },
  { name: "Swing voters", frames: 117 },
  { name: "Reason 3", frames: 144 },
  { name: "Gallant night", frames: 195 },
  { name: "Ballot box", frames: 153 },
  { name: "Don't know", frames: 117 },
  { name: "Think twice", frames: 84 },
];
const DURATION = SCENES.reduce((sum, s) => sum + s.frames, 0);

/* ---------- building blocks ---------- */

type Placed = {
  at: number;
  name: string;
  x?: number; // offset from frame center
  y?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

const Pop: React.FC<Placed> = ({ at, name, x = 0, y = 0, style, children }) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        translate: `calc(-50% + ${x}px) calc(-50% + ${y}px)`,
        filter: SHADOW,
        ...style,
        scale: interpolate(frame, [at, at + 18], [0, 1], {
          ...clamp,
          easing: Easing.spring({ damping: 11 }),
          output: "perceptual-scale",
        }),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

const Emoji: React.FC<{ name: string; size: number }> = ({ name, size }) => (
  <Img src={staticFile(`emoji/${name}.svg`)} style={{ width: size, height: size, display: "block" }} />
);

const Person: React.FC<{ color: string; size?: number }> = ({ color, size = 1 }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * size }}>
    <div style={{ width: 70 * size, height: 70 * size, borderRadius: "50%", backgroundColor: color }} />
    <div
      style={{
        width: 110 * size,
        height: 120 * size,
        borderRadius: `${55 * size}px ${55 * size}px 18px 18px`,
        backgroundColor: color,
      }}
    />
  </div>
);

// Numbered reason marker in the top-right corner.
const ReasonNumber: React.FC<{ n: number; star?: boolean }> = ({ n, star }) => (
  <Pop at={0} name={`Reason ${n}`} x={760} y={-380}>
    <div
      style={{
        width: 190,
        height: 190,
        borderRadius: "50%",
        backgroundColor: RED,
        color: WHITE,
        fontFamily,
        fontWeight: 900,
        fontSize: 130,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        border: `8px solid ${WHITE}`,
      }}
    >
      {n}
    </div>
    {star ? (
      <div style={{ position: "absolute", top: -50, left: -50 }}>
        <Emoji name="star" size={110} />
      </div>
    ) : null}
  </Pop>
);

const Scene: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: interpolate(frame, [frames - 6, frames], [1, 0], clamp) }}>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- scenes ---------- */

// "Will Netanyahu strike Iran to win the election?"
const Hook: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Pop at={4} name="Ballot" x={-120}>
        <Emoji name="ballot" size={420} />
      </Pop>
      <Pop at={24} name="Question" x={260} y={-60}>
        <Emoji name="question" size={300} />
      </Pop>
      <Interactive.Div
        name="Jet"
        style={{
          position: "absolute",
          left: "50%",
          top: 150,
          filter: SHADOW,
          rotate: "-135deg",
          translate: interpolate(frame, [0, 40], ["900px 0px", "-1300px 60px"], { ...clamp, easing: inOut }),
        }}
      >
        <Emoji name="airplane" size={260} />
      </Interactive.Div>
    </Scene>
  );
};

// "Maybe — but it could actually hurt him politically."
const Maybe: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <svg
        viewBox="0 0 1000 500"
        style={{ position: "absolute", left: 360, top: 200, width: 1200, height: 600, filter: SHADOW, overflow: "visible" }}
      >
        <path d="M0 500 H1000 M0 500 V0" stroke={WHITE} strokeWidth={10} strokeLinecap="round" opacity={0.7} />
        <polyline
          points="20,440 220,370 420,280 600,140 700,100 820,320 980,460"
          fill="none"
          stroke={RED}
          strokeWidth={24}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={interpolate(frame, [0, 50], [1, 0], { ...clamp, easing: inOut })}
        />
      </svg>
      <Pop at={48} name="Warning" x={420} y={-220}>
        <Emoji name="warning" size={240} />
      </Pop>
    </Scene>
  );
};

// "Here's why — I saved the most interesting reason for last."
const HeresWhy: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const cards = [1, 2, 3];
  return (
    <Scene frames={frames}>
      {cards.map((n, i) => (
        <Pop key={n} at={i * 8} name={`Card ${n}`} x={(1 - i) * 420} y={40}>
          <div
            style={{
              width: 300,
              height: 380,
              borderRadius: 36,
              backgroundColor: n === 3 ? YELLOW : WHITE,
              color: n === 3 ? NAVY : RED,
              fontFamily,
              fontWeight: 900,
              fontSize: 220,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {n}
          </div>
        </Pop>
      ))}
      <Pop at={30} name="Star" x={-420} y={-250}>
        <Interactive.Div
          name="Star spin"
          style={{ rotate: interpolate(frame, [30, frames], ["0deg", "40deg"], clamp) }}
        >
          <Emoji name="star" size={190} />
        </Interactive.Div>
      </Pop>
    </Scene>
  );
};

// "It didn't work last time — he lost seats in the polls."
const Reason1: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const bars = [430, 360, 290, 210];
  return (
    <Scene frames={frames}>
      <ReasonNumber n={1} />
      <Pop at={6} name="Strike" x={-560} y={-60}>
        <Emoji name="airplane" size={200} />
        <div style={{ position: "absolute", left: 120, top: 130 }}>
          <Emoji name="boom" size={200} />
        </div>
      </Pop>
      <div
        style={{
          position: "absolute",
          left: 760,
          bottom: 170,
          display: "flex",
          alignItems: "flex-end",
          gap: 40,
          filter: SHADOW,
          direction: "ltr", // time runs left to right, like the line chart
        }}
      >
        {bars.map((h, i) => (
          <Interactive.Div
            key={i}
            name={`Bar ${i + 1}`}
            style={{
              width: 130,
              borderRadius: "20px 20px 0 0",
              backgroundColor: i === bars.length - 1 ? RED : BLUE,
              height: interpolate(frame, [40 + i * 15, 58 + i * 15], [0, h], { ...clamp, easing: outExpo }),
            }}
          />
        ))}
      </div>
      <Interactive.Div
        name="Baseline"
        style={{
          position: "absolute",
          left: 730,
          bottom: 160,
          height: 12,
          borderRadius: 6,
          backgroundColor: WHITE,
          width: interpolate(frame, [30, 45], [0, 700], { ...clamp, easing: outExpo }),
        }}
      />
      <Pop at={110} name="Disappointed" x={600} y={-80}>
        <Emoji name="disappointed" size={230} />
      </Pop>
    </Scene>
  );
};

// "Under two weeks before the election — looks like trading security for politics."
const Reason2: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <ReasonNumber n={2} />
      <AbsoluteFill style={{ opacity: interpolate(frame, [85, 95], [1, 0], clamp) }}>
        <Pop at={6} name="Calendar" x={-200}>
          <div
            style={{
              width: 380,
              height: 400,
              borderRadius: 36,
              overflow: "hidden",
              backgroundColor: WHITE,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ height: 100, backgroundColor: RED }} />
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontFamily,
                fontWeight: 900,
                fontSize: 220,
                color: NAVY,
              }}
            >
              {Math.round(interpolate(frame, [15, 60], [30, 13], { ...clamp, easing: outExpo }))}
            </div>
          </div>
        </Pop>
        <Pop at={20} name="Hourglass" x={240}>
          <Interactive.Div
            name="Hourglass flip"
            style={{ rotate: interpolate(frame, [35, 55], ["0deg", "180deg"], { ...clamp, easing: inOut }) }}
          >
            <Emoji name="hourglass" size={260} />
          </Interactive.Div>
        </Pop>
      </AbsoluteFill>
      {/* Balance scale: politics (ballot) outweighs security (shield) */}
      <Pop at={95} name="Scale" y={60} style={{ width: 1100, height: 600 }}>
        <div
          style={{
            position: "absolute",
            left: 530,
            top: 90,
            width: 40,
            height: 480,
            backgroundColor: GRAY,
            borderRadius: 12,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 400,
            top: 550,
            width: 300,
            height: 40,
            backgroundColor: GRAY,
            borderRadius: 12,
          }}
        />
        <Interactive.Div
          name="Beam"
          style={{
            position: "absolute",
            left: 0,
            top: 70,
            width: 1100,
            height: 36,
            borderRadius: 18,
            backgroundColor: WHITE,
            rotate: interpolate(frame, [130, 165], ["0deg", "-12deg"], {
              ...clamp,
              easing: Easing.spring({ damping: 8 }),
            }),
          }}
        >
          <div style={{ position: "absolute", right: -60, bottom: 30 }}>
            <Emoji name="shield" size={230} />
          </div>
          <div style={{ position: "absolute", left: -60, bottom: 30 }}>
            <Emoji name="ballot" size={230} />
          </div>
        </Interactive.Div>
      </Pop>
      <Pop at={190} name="True or not?" y={-330}>
        <Emoji name="question" size={150} />
      </Pop>
    </Scene>
  );
};

// "It could push away the soft-right swing voters."
const SwingVoters: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const people = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const isSwing = (d: number) => Math.abs(d) >= 3;
  return (
    <Scene frames={frames}>
      {people.map((d, i) => (
        <Pop key={d} at={4 + i * 3} name={`Person ${d}`} x={d * 170} y={60}>
          <Interactive.Div
            name={`Walk ${d}`}
            style={{
              opacity: isSwing(d) ? interpolate(frame, [55, 95], [1, 0.3], clamp) : 1,
              translate: isSwing(d)
                ? interpolate(frame, [55, 95], ["0px 0px", `${Math.sign(d) * 150}px 0px`], { ...clamp, easing: inOut })
                : "0px 0px",
            }}
          >
            <Person color={isSwing(d) ? YELLOW : BLUE} size={1.3} />
          </Interactive.Div>
        </Pop>
      ))}
      {[-1, 1].map((side) => (
        <Pop key={side} at={50} name={`Arrow ${side}`} x={side * 560} y={-200}>
          <div
            style={{
              fontFamily,
              fontWeight: 900,
              fontSize: 200,
              color: YELLOW,
              lineHeight: 1,
              scale: side === 1 ? "1 1" : "-1 1",
            }}
          >
            →
          </div>
        </Pop>
      ))}
    </Scene>
  );
};

// "The most interesting: the effect on those who'll never vote for him."
const Reason3: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const crowd = [0, 1, 2, 3, 4, 5];
  return (
    <Scene frames={frames}>
      <ReasonNumber n={3} star />
      <Pop at={15} name="Eyes" x={420} y={-40}>
        <Interactive.Div
          name="Eyes look"
          style={{ translate: interpolate(frame, [60, 80], ["0px 0px", "-60px 20px"], { ...clamp, easing: inOut }) }}
        >
          <Emoji name="eyes" size={320} />
        </Interactive.Div>
      </Pop>
      {crowd.map((i) => (
        <Pop key={i} at={40 + i * 5} name={`Opposition ${i + 1}`} x={-640 + (i % 3) * 190} y={i < 3 ? -80 : 200}>
          <Person color={RED} size={1.1} />
        </Pop>
      ))}
    </Scene>
  );
};

// "Like Gallant night — real fear, panic, can't sit at home."
const GallantNight: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const faces = [
    { at: 30, x: -620, y: -200 },
    { at: 45, x: 620, y: -160 },
    { at: 60, x: -540, y: 250 },
  ];
  return (
    <Scene frames={frames}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle, ${RED} 0%, transparent 65%)`,
          opacity: interpolate(frame, [0, 15], [0, 1], clamp) * (0.35 + 0.25 * Math.sin(frame / 3)),
        }}
      />
      <Pop at={0} name="Siren" y={-60}>
        <Interactive.Div name="Siren wobble" style={{ rotate: `${Math.sin(frame / 2) * 8}deg` }}>
          <Emoji name="siren" size={380} />
        </Interactive.Div>
      </Pop>
      {faces.map((f, i) => (
        <Pop key={i} at={f.at} name={`Scream ${i + 1}`} x={f.x} y={f.y}>
          <Emoji name="scream" size={220} />
        </Pop>
      ))}
      <Pop at={110} name="House" x={560} y={300}>
        <Emoji name="house" size={260} />
      </Pop>
      <Interactive.Div
        name="Runner"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          filter: SHADOW,
          opacity: interpolate(frame, [125, 135], [0, 1], clamp),
          translate: interpolate(frame, [125, 175], ["420px 200px", "-60px 200px"], { ...clamp, easing: outExpo }),
        }}
      >
        {/* Mirrored so the runner faces the direction it runs (out of the house) */}
        <div style={{ scale: "-1 1" }}>
          <Emoji name="runner" size={220} />
        </div>
      </Interactive.Div>
    </Scene>
  );
};

// "This time not to the streets — to the ballot box. Opposition turnout rises."
const BallotBox: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Pop at={0} name="Placard" x={-560} y={-20}>
        <Emoji name="placard" size={300} />
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: -20, width: 340, height: 340, overflow: "visible" }}>
          <path
            d="M10 10 L90 90 M90 10 L10 90"
            stroke={RED}
            strokeWidth={10}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={interpolate(frame, [22, 38], [1, 0], clamp)}
          />
        </svg>
      </Pop>
      <Pop at={40} name="Arrow" x={-180} y={-20}>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 220, color: WHITE, lineHeight: 1 }}>→</div>
      </Pop>
      <Pop at={48} name="Ballot" x={200} y={-20}>
        <Emoji name="ballot" size={360} />
      </Pop>
      <Pop at={90} name="Chart up" x={620} y={-180}>
        <Emoji name="chart-up" size={200} />
      </Pop>
      <Interactive.Div
        name="Turnout bar"
        style={{
          position: "absolute",
          left: 1500,
          bottom: 150,
          width: 140,
          borderRadius: "20px 20px 0 0",
          backgroundColor: YELLOW,
          filter: SHADOW,
          height: interpolate(frame, [100, 135], [0, 380], { ...clamp, easing: outExpo }),
        }}
      />
    </Scene>
  );
};

// "I don't know if there'll be a strike, or what his motives are."
const DontKnow: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Pop at={0} name="Thinking">
        <Emoji name="thinking" size={420} />
      </Pop>
      {[
        { at: 20, x: -420, phase: 0 },
        { at: 50, x: 420, phase: 2 },
      ].map((q) => (
        <Pop key={q.x} at={q.at} name={`Question ${q.x}`} x={q.x} y={-120}>
          <div style={{ translate: `0px ${Math.sin(frame / 8 + q.phase) * 20}px` }}>
            <Emoji name="question" size={200} />
          </div>
        </Pop>
      ))}
    </Scene>
  );
};

// "But assuming it necessarily helps him? I'd think twice."
const ThinkTwice: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      {/* Two loops around the brain: "think twice" */}
      <Pop at={0} name="Loop">
        <Interactive.Div
          name="Loop spin"
          style={{ rotate: interpolate(frame, [0, 70], ["0deg", "720deg"], { ...clamp, easing: inOut }) }}
        >
          <svg viewBox="0 0 100 100" style={{ width: 600, height: 600, display: "block" }}>
            <circle cx={50} cy={50} r={44} fill="none" stroke={YELLOW} strokeWidth={5} strokeLinecap="round" strokeDasharray="60 9.1" />
            <path d="M88 34 L95 44 L84 46 Z" fill={YELLOW} />
            <path d="M12 66 L5 56 L16 54 Z" fill={YELLOW} />
          </svg>
        </Interactive.Div>
      </Pop>
      <Pop at={10} name="Brain">
        <Interactive.Div
          name="Brain pulse"
          style={{
            scale: interpolate(frame, [20, 30, 40, 50, 60, 70], [1, 1.15, 1, 1.15, 1, 1], {
              ...clamp,
              output: "perceptual-scale",
            }),
          }}
        >
          <Emoji name="brain" size={300} />
        </Interactive.Div>
      </Pop>
    </Scene>
  );
};

const SCENE_COMPONENTS: React.FC<{ frames: number }>[] = [
  Hook,
  Maybe,
  HeresWhy,
  Reason1,
  Reason2,
  SwingVoters,
  Reason3,
  GallantNight,
  BallotBox,
  DontKnow,
  ThinkTwice,
];

/* ---------- main ---------- */

export const IranGraphics: React.FC = () => {
  let from = 0;
  return (
    <AbsoluteFill style={{ fontFamily, direction: "rtl" }}>
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

// Preview only: the graphics placed over the lower part of a vertical frame.
const PREVIEW_W = 1080;
const PREVIEW_H = 1920;
const PREVIEW_SCALE = PREVIEW_W / WIDTH;

export const IranPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundImage: "linear-gradient(180deg, #6B7280 0%, #374151 100%)", fontFamily }}>
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 380, color: "rgba(255,255,255,0.45)", fontSize: 60 }}>
      <div style={{ width: 420, height: 520, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)" }} />
      <div style={{ marginTop: 30 }}>כאן הפנים שלך</div>
    </AbsoluteFill>
    <div
      style={{
        position: "absolute",
        left: 0,
        top: PREVIEW_H - HEIGHT * PREVIEW_SCALE - 160,
        width: WIDTH,
        height: HEIGHT,
        transformOrigin: "top left",
        scale: PREVIEW_SCALE,
        outline: "4px dashed rgba(255,255,255,0.3)",
      }}
    >
      <IranGraphics />
    </div>
  </AbsoluteFill>
);

export const IranComposition = () => {
  return (
    <>
      <Composition
        id="IranElections"
        component={IranGraphics}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="IranElectionsPreview"
        component={IranPreview}
        durationInFrames={DURATION}
        fps={FPS}
        width={PREVIEW_W}
        height={PREVIEW_H}
      />
    </>
  );
};
