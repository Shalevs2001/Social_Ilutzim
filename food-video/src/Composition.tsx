import {
  AbsoluteFill,
  Composition,
  Easing,
  Interactive,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const fontFamily = "Rubik";
loadFont({ family: fontFamily, url: staticFile("fonts/Rubik-Medium.ttf"), weight: "500" });
loadFont({ family: fontFamily, url: staticFile("fonts/Rubik-Black.ttf"), weight: "900" });

const FPS = 30;
const SCENE = 3 * FPS;
const FINALE = 4 * FPS;

type Food = {
  emoji: string;
  name: string;
  tagline: string;
  bg: string;
  accent: string;
};

const FOODS: Food[] = [
  { emoji: "🍕", name: "פיצה", tagline: "משולש של אושר", bg: "#C0392B", accent: "#FFD166" },
  { emoji: "🍔", name: "המבורגר", tagline: "עסיסי, כפול, מושלם", bg: "#6D3B1E", accent: "#F4A261" },
  { emoji: "🍣", name: "סושי", tagline: "אורז, דג ואהבה", bg: "#1D3557", accent: "#F28482" },
];

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

const FoodScene: React.FC<{ food: Food }> = ({ food }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: food.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        direction: "rtl",
        opacity: interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], clamp),
      }}
    >
      <Interactive.Div
        name="Glow"
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          backgroundColor: food.accent,
          opacity: 0.18,
          scale: interpolate(frame, [0, durationInFrames], [0.6, 1.15], {
            ...clamp,
            output: "perceptual-scale",
          }),
        }}
      />
      <Interactive.Div
        name="Emoji"
        style={{
          fontSize: 380,
          lineHeight: 1,
          scale: interpolate(frame, [0, 0.6 * fps], [0, 1], {
            ...clamp,
            easing: Easing.spring({ damping: 12 }),
            output: "perceptual-scale",
          }),
          rotate: interpolate(frame, [0, 0.6 * fps, durationInFrames], ["-40deg", "0deg", "8deg"], {
            ...clamp,
            easing: [Easing.bezier(0.16, 1, 0.3, 1), Easing.linear],
          }),
        }}
      >
        {food.emoji}
      </Interactive.Div>
      <Interactive.Div
        name="Name"
        style={{
          marginTop: 30,
          fontSize: 150,
          fontWeight: 900,
          color: "white",
          opacity: interpolate(frame, [0.4 * fps, 0.9 * fps], [0, 1], clamp),
          translate: interpolate(frame, [0.4 * fps, 0.9 * fps], ["0px 80px", "0px 0px"], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {food.name}
      </Interactive.Div>
      <Interactive.Div
        name="Tagline"
        style={{
          fontSize: 56,
          fontWeight: 500,
          color: food.accent,
          opacity: interpolate(frame, [0.9 * fps, 1.4 * fps], [0, 1], clamp),
          translate: interpolate(frame, [0.9 * fps, 1.4 * fps], ["0px 40px", "0px 0px"], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        {food.tagline}
      </Interactive.Div>
    </AbsoluteFill>
  );
};

const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#FFF4E0",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        direction: "rtl",
      }}
    >
      <div style={{ display: "flex", gap: 80 }}>
        {FOODS.map((food, i) => (
          <Interactive.Div
            key={food.name}
            name={`Finale ${food.name}`}
            style={{
              fontSize: 260,
              lineHeight: 1,
              scale: interpolate(frame, [i * 6, i * 6 + 0.6 * fps], [0, 1], {
                ...clamp,
                easing: Easing.spring({ damping: 10 }),
                output: "perceptual-scale",
              }),
              translate: interpolate(
                frame,
                [1.5 * fps, 2.25 * fps, 3 * fps, 3.75 * fps],
                ["0px 0px", "0px -30px", "0px 0px", "0px -30px"],
                { ...clamp, easing: Easing.inOut(Easing.sin) },
              ),
            }}
          >
            {food.emoji}
          </Interactive.Div>
        ))}
      </div>
      <Interactive.Div
        name="Finale Title"
        style={{
          marginTop: 60,
          fontSize: 120,
          fontWeight: 900,
          color: "#2B2D42",
          opacity: interpolate(frame, [0.8 * fps, 1.3 * fps], [0, 1], clamp),
          scale: interpolate(frame, [0.8 * fps, 1.3 * fps], [0.8, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      >
        פיצה, המבורגר וסושי
      </Interactive.Div>
      <Interactive.Div
        name="Finale Subtitle"
        style={{
          marginTop: 10,
          fontSize: 56,
          fontWeight: 500,
          color: "#C0392B",
          opacity: interpolate(frame, [1.4 * fps, 1.9 * fps], [0, 1], clamp),
        }}
      >
        למה לבחור? 😋
      </Interactive.Div>
    </AbsoluteFill>
  );
};

export const FoodVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {FOODS.map((food, i) => (
        <Sequence key={food.name} name={food.name} from={i * SCENE} durationInFrames={SCENE}>
          <FoodScene food={food} />
        </Sequence>
      ))}
      <Sequence name="Finale" from={FOODS.length * SCENE} durationInFrames={FINALE}>
        <Finale />
      </Sequence>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="FoodVideo"
      component={FoodVideo}
      durationInFrames={FOODS.length * SCENE + FINALE}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
