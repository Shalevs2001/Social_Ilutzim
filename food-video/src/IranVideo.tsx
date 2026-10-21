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

const FPS = 30;
// Landscape overlay on a transparent background: the graphics live in a
// panel on the left so the speaker in the footage stays visible.
const WIDTH = 1920;
const HEIGHT = 1080;
const PANEL = { left: 50, top: 50, width: 760, height: 980 };
// Scenes are designed on a 1080×1440 canvas and scaled into the panel.
const DESIGN = { width: 1080, height: 1440 };
const DESIGN_SCALE = 0.66;

const NAVY = "#0B1426";
const RED = "#E63946";
const YELLOW = "#FFD60A";
const WHITE = "#FFFFFF";
const MUTED = "#A9B4C8";

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
const outExpo = Easing.bezier(0.16, 1, 0.3, 1);

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

const Rise: React.FC<{ at: number; name: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  name,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
        ...style,
        opacity: interpolate(frame, [at, at + 10], [0, 1], clamp),
        translate: interpolate(frame, [at, at + 16], ["0px 70px", "0px 0px"], { ...clamp, easing: outExpo }),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

const Pop: React.FC<{ at: number; name: string; style?: React.CSSProperties; children: React.ReactNode }> = ({
  at,
  name,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <Interactive.Div
      name={name}
      style={{
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

// Marker highlight that sweeps in from the right (RTL).
const Mark: React.FC<{ at: number; color?: string; children: React.ReactNode }> = ({
  at,
  color = YELLOW,
  children,
}) => {
  const frame = useCurrentFrame();
  return (
    <span
      style={{
        color: NAVY,
        padding: "0 16px",
        boxDecorationBreak: "clone",
        WebkitBoxDecorationBreak: "clone",
        backgroundImage: `linear-gradient(${color}, ${color})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right center",
        backgroundSize: `${interpolate(frame, [at, at + 14], [0, 100], { ...clamp, easing: outExpo })}% 100%`,
      }}
    >
      {children}
    </span>
  );
};

const Badge: React.FC<{ at: number; children: React.ReactNode }> = ({ at, children }) => (
  <Pop
    at={at}
    name="Badge"
    style={{
      backgroundColor: RED,
      color: WHITE,
      fontSize: 56,
      fontWeight: 900,
      padding: "14px 44px",
      borderRadius: 999,
    }}
  >
    {children}
  </Pop>
);

const big: React.CSSProperties = {
  fontSize: 104,
  fontWeight: 900,
  color: WHITE,
  lineHeight: 1.2,
  textAlign: "center",
};
const medium: React.CSSProperties = {
  fontSize: 70,
  fontWeight: 900,
  color: WHITE,
  lineHeight: 1.25,
  textAlign: "center",
};
const small: React.CSSProperties = {
  fontSize: 50,
  fontWeight: 500,
  color: MUTED,
  lineHeight: 1.3,
  textAlign: "center",
};

const Scene: React.FC<{ frames: number; children: React.ReactNode }> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        left: PANEL.left + (PANEL.width - DESIGN.width * DESIGN_SCALE) / 2,
        top: PANEL.top + (PANEL.height - DESIGN.height * DESIGN_SCALE) / 2,
        width: DESIGN.width,
        height: DESIGN.height,
        transformOrigin: "top left",
        scale: DESIGN_SCALE,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 44,
        padding: "0 70px",
        opacity: interpolate(frame, [frames - 6, frames], [1, 0], clamp),
      }}
    >
      {children}
    </div>
  );
};

/* ---------- scenes ---------- */

const Hook: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <div style={{ display: "flex", gap: 60 }}>
      <Pop at={0} name="Airplane">
        <Emoji name="airplane" size={190} />
      </Pop>
      <Pop at={6} name="Ballot">
        <Emoji name="ballot" size={190} />
      </Pop>
    </div>
    <Rise at={2} name="Line 1" style={big}>
      נתניהו באמת יתקוף באיראן
    </Rise>
    <Rise at={14} name="Line 2" style={{ ...big, color: YELLOW }}>
      בשביל לנצח בבחירות?
    </Rise>
  </Scene>
);

const Maybe: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Pop at={0} name="Maybe" style={{ ...big, fontSize: 150 }}>
      אולי.
    </Pop>
    <Rise at={20} name="But" style={medium}>
      אבל יש מצב שתקיפה כזאת
    </Rise>
    <Rise at={34} name="Hurt him" style={big}>
      <Mark at={44} color={RED}>
        <span style={{ color: WHITE }}>בכלל תפגע בו פוליטית</span>
      </Mark>
    </Rise>
  </Scene>
);

const HeresWhy: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Rise at={0} name="Here's why" style={{ ...big, fontSize: 140 }}>
      הנה למה
    </Rise>
    <Pop at={10} name="Point down">
      <Emoji name="point-down" size={170} />
    </Pop>
    <Rise at={24} name="Saved for last" style={small}>
      (את הסיבה הכי מעניינת שמרתי לסוף)
    </Rise>
  </Scene>
);

const Reason1: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Badge at={0}>סיבה 1</Badge>
    <Rise at={10} name="Didn't work" style={big}>
      זה לא ממש עבד בפעם הקודמת
    </Rise>
    <Pop at={55} name="Chart down">
      <Emoji name="chart-down" size={220} />
    </Pop>
    <Rise at={65} name="Disappointment" style={small}>
      החמיצות והאכזבה אחרי התקיפה השנייה באיראן
    </Rise>
    <Rise at={100} name="Lost seats" style={medium}>
      <Mark at={110}>נתניהו איבד מנדטים בסקרים</Mark>
    </Rise>
  </Scene>
);

const Reason2: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Badge at={0}>סיבה 2</Badge>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Pop at={8} name="Hourglass">
          <Emoji name="hourglass" size={130} />
        </Pop>
        <Rise at={12} name="Two weeks" style={{ ...medium, textAlign: "right" }}>
          פחות משבועיים
          <br />
          לפני הבחירות
        </Rise>
      </div>
      <Rise at={55} name="Looks like" style={small}>
        נתניהו עלול להיראות כמי שמשעבד
      </Rise>
      <Rise at={70} name="Security vs politics" style={medium}>
        את <span style={{ color: YELLOW }}>הביטחון</span> לטובת <span style={{ color: RED }}>שיקולים פוליטיים</span>
      </Rise>
      {/* Balance scale: politics outweighs security */}
      <Pop at={95} name="Scale" style={{ position: "relative", width: 820, height: 260, marginTop: 20 }}>
        <div
          style={{
            position: "absolute",
            left: 395,
            top: 60,
            width: 30,
            height: 200,
            backgroundColor: MUTED,
            borderRadius: 8,
          }}
        />
        <Interactive.Div
          name="Beam"
          style={{
            position: "absolute",
            left: 0,
            top: 40,
            width: 820,
            height: 24,
            borderRadius: 12,
            backgroundColor: WHITE,
            rotate: interpolate(frame, [120, 150], ["0deg", "-12deg"], {
              ...clamp,
              easing: Easing.spring({ damping: 8 }),
            }),
          }}
        >
          <div
            style={{
              position: "absolute",
              right: -40,
              top: 40,
              ...medium,
              fontSize: 54,
              backgroundColor: YELLOW,
              color: NAVY,
              padding: "8px 28px",
              borderRadius: 16,
            }}
          >
            ביטחון
          </div>
          <div
            style={{
              position: "absolute",
              left: -40,
              top: 40,
              ...medium,
              fontSize: 54,
              backgroundColor: RED,
              padding: "8px 28px",
              borderRadius: 16,
            }}
          >
            פוליטיקה
          </div>
        </Interactive.Div>
      </Pop>
      <Rise at={175} name="True or not" style={{ ...small, fontSize: 42 }}>
        * בלי קשר לשאלה אם זה נכון או לא
      </Rise>
    </Scene>
  );
};

const SwingVoters: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const dots = [-3, -2, -1, 0, 1, 2, 3];
  return (
    <Scene frames={frames}>
      <Rise at={0} name="Push away" style={small}>
        וזה יכול להרחיק ממנו
      </Rise>
      <Rise at={10} name="Most important" style={big}>
        את הקהל הכי חשוב
      </Rise>
      <div style={{ display: "flex", gap: 34, margin: "20px 0" }}>
        {dots.map((d) => (
          <Interactive.Div
            key={d}
            name={`Voter ${d}`}
            style={{
              width: 70,
              height: 70,
              borderRadius: "50%",
              backgroundColor: YELLOW,
              opacity: interpolate(frame, [20, 30, 75, 100], [0, 1, 1, 0.25], clamp),
              translate: interpolate(frame, [75, 100], ["0px 0px", `${d * 70}px 0px`], {
                ...clamp,
                easing: outExpo,
              }),
            }}
          />
        ))}
      </div>
      <Rise at={35} name="Swing voters" style={medium}>
        <Mark at={45}>המתנדנדים מהימין הרך</Mark>
      </Rise>
      <Rise at={60} name="Statesmanship" style={small}>
        שמחפשים ממלכתיות
      </Rise>
    </Scene>
  );
};

const Reason3: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Badge at={0}>סיבה 3 – הכי מעניינת</Badge>
    <Pop at={14} name="Eyes">
      <Emoji name="eyes" size={190} />
    </Pop>
    <Rise at={28} name="Effect on" style={medium}>
      ההשפעה של תקיפה כזו
      <br />
      דווקא על
    </Rise>
    <Rise at={50} name="Won't vote" style={big}>
      <Mark at={62}>מי שבוודאות לא יצביע לנתניהו</Mark>
    </Rise>
  </Scene>
);

const GallantNight: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const fears = [
    { at: 30, text: "פחד אמיתי" },
    { at: 55, text: "בהלה" },
    { at: 85, text: "המצב יוצא משליטה" },
    { at: 115, text: "נתניהו איבד את כל הבלמים" },
    { at: 150, text: "אי אפשר לשבת בבית" },
  ];
  return (
    <>
      <div
        style={{
          position: "absolute",
          ...PANEL,
          borderRadius: 40,
          backgroundColor: RED,
          opacity: interpolate(frame, [0, 20, frames - 10, frames], [0, 1, 1, 0], clamp) * (0.18 + 0.1 * Math.sin(frame / 4)),
        }}
      />
      <Scene frames={frames}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Pop at={0} name="Siren">
            <Emoji name="siren" size={150} />
          </Pop>
          <Rise at={4} name="Like Gallant night" style={big}>
            כמו בליל גלנט
          </Rise>
        </div>
        {fears.map((f, i) => (
          <Pop
            key={f.text}
            at={f.at}
            name={f.text}
            style={{
              ...medium,
              backgroundColor: i === fears.length - 1 ? YELLOW : "rgba(255,255,255,0.12)",
              color: i === fears.length - 1 ? NAVY : WHITE,
              padding: "10px 40px",
              borderRadius: 20,
              rotate: `${(i % 2 === 0 ? 1 : -1) * 2}deg`,
            }}
          >
            {f.text}
          </Pop>
        ))}
      </Scene>
    </>
  );
};

const BallotBox: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  return (
    <Scene frames={frames}>
      <Rise at={0} name="This time" style={small}>
        אבל הפעם
      </Rise>
      <Rise at={8} name="Instead of streets" style={{ ...big, color: MUTED, position: "relative" }}>
        במקום לרחובות
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "52%",
            height: 12,
            borderRadius: 6,
            backgroundColor: RED,
            width: `${interpolate(frame, [30, 42], [0, 100], { ...clamp, easing: outExpo })}%`,
          }}
        />
      </Rise>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Pop at={50} name="Ballot">
          <Emoji name="ballot" size={200} />
        </Pop>
        <Pop at={56} name="To the polls" style={{ ...big, fontSize: 140, color: YELLOW }}>
          לקלפי
        </Pop>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 30 }}>
        <Pop at={95} name="Chart up">
          <Emoji name="chart-up" size={130} />
        </Pop>
        <Rise at={98} name="Turnout" style={{ ...medium, textAlign: "right" }}>
          אחוזי ההצבעה
          <br />
          באופוזיציה עולים
        </Rise>
      </div>
    </Scene>
  );
};

const DontKnow: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Pop at={0} name="Thinking">
      <Emoji name="thinking" size={210} />
    </Pop>
    <Rise at={10} name="Strike?" style={medium}>
      אני לא יודע אם תהיה תקיפה
    </Rise>
    <Rise at={50} name="Motives" style={medium}>
      ואני לא יודע מה
      <br />
      המניעים של נתניהו
    </Rise>
  </Scene>
);

const ThinkTwice: React.FC<{ frames: number }> = ({ frames }) => (
  <Scene frames={frames}>
    <Rise at={0} name="Assumption" style={medium}>
      אבל ההנחה שזה בהכרח
      <br />
      יעזור לו בבחירות?
    </Rise>
    <Pop at={30} name="Think twice" style={{ ...big, fontSize: 130 }}>
      <Mark at={40}>הייתי חושב פעמיים</Mark>
    </Pop>
  </Scene>
);

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

export const IranVideo: React.FC<{ preview: boolean }> = ({ preview }) => {
  const frame = useCurrentFrame();
  let from = 0;

  return (
    <AbsoluteFill style={{ fontFamily, direction: "rtl" }}>
      {preview ? (
        // Stand-in for the footage, only in the preview composition.
        <AbsoluteFill
          style={{
            backgroundImage: "linear-gradient(135deg, #6B7280 0%, #374151 100%)",
            justifyContent: "center",
            alignItems: "center",
            paddingLeft: PANEL.left + PANEL.width,
            fontSize: 60,
            fontWeight: 500,
            color: "rgba(255,255,255,0.4)",
          }}
        >
          כאן הסרטון שלך
        </AbsoluteFill>
      ) : null}
      <Interactive.Div
        name="Panel"
        style={{
          position: "absolute",
          ...PANEL,
          borderRadius: 40,
          overflow: "hidden",
          backgroundColor: "rgba(11, 20, 38, 0.85)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          opacity: interpolate(frame, [0, 8, DURATION - 8, DURATION], [0, 1, 1, 0], clamp),
          translate: interpolate(frame, [0, 14, DURATION - 14, DURATION], ["-120px 0px", "0px 0px", "0px 0px", "-120px 0px"], {
            ...clamp,
            easing: outExpo,
          }),
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            height: 12,
            backgroundColor: RED,
            width: `${interpolate(frame, [0, DURATION], [0, 100], clamp)}%`,
          }}
        />
      </Interactive.Div>
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

export const IranComposition = () => {
  return (
    <>
      <Composition
        id="IranElections"
        component={IranVideo}
        defaultProps={{ preview: false }}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="IranElectionsPreview"
        component={IranVideo}
        defaultProps={{ preview: true }}
        durationInFrames={DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
