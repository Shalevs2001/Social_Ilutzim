import {
  AbsoluteFill,
  Composition,
  Easing,
  Img,
  Interactive,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { fontFamily } from "./fonts";

const FPS = 30;
const CREAM = "#FFF4E0";

type Food = {
  image: string;
  name: string;
  bg: string;
};

// Order of appearance; in RTL the first one sits on the right.
const FOODS: Food[] = [
  { image: "emoji/pizza.svg", name: "פיצה", bg: "#C0392B" },
  { image: "emoji/hamburger.svg", name: "המבורגר", bg: "#6D3B1E" },
  { image: "emoji/sushi.svg", name: "סושי", bg: "#1D3557" },
];

// Timeline (frames)
const POP_GAP = 12; // delay between items popping in
const POP_LEN = 18;
const TO_COLUMN_START = 60;
const TO_COLUMN_END = 85;
const SPOT_START = 100; // first item flies to center
const SPOT_LEN = 70; // in + hold + out
const SPOT_MOVE = 18;
const TO_ROW_START = SPOT_START + FOODS.length * SPOT_LEN + 10;
const TO_ROW_END = TO_ROW_START + 25;
const DURATION = TO_ROW_END + 60;

// Layout: element box is BOX×BOX, positions are its center.
// Images are laid out at their biggest (center) size and scaled down elsewhere,
// so they stay sharp when shown big.
const BOX = 560;
const IMAGE = 510;
const ROW_Y = 480;
const rowX = (i: number) => 1460 - i * 500;
const COLUMN_X = 1720;
const columnY = (i: number) => 270 + i * 270;
const CENTER = { x: 960, y: 440 };

const at = (x: number, y: number) => `${x - BOX / 2}px ${y - BOX / 2}px`;

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

const FoodItem: React.FC<{ food: Food; i: number }> = ({ food, i }) => {
  const frame = useCurrentFrame();
  const pop = i * POP_GAP;
  const s = SPOT_START + i * SPOT_LEN;
  const keys = [
    TO_COLUMN_START,
    TO_COLUMN_END,
    s,
    s + SPOT_MOVE,
    s + SPOT_LEN - SPOT_MOVE,
    s + SPOT_LEN,
    TO_ROW_START,
    TO_ROW_END,
  ];
  const row = at(rowX(i), ROW_Y);
  const col = at(COLUMN_X, columnY(i));
  const center = at(CENTER.x, CENTER.y);

  return (
    <Interactive.Div
      name={food.name}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: BOX,
        height: BOX,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: frame >= s && frame < s + SPOT_LEN ? 2 : 1,
        translate: interpolate(frame, keys, [row, col, col, center, center, col, col, row], {
          ...clamp,
          easing: ease,
        }),
        scale: interpolate(frame, keys, [0.6, 0.3, 0.3, 1, 1, 0.3, 0.3, 0.6], {
          ...clamp,
          easing: ease,
          output: "perceptual-scale",
        }),
      }}
    >
      <Img
        src={staticFile(food.image)}
        style={{
          width: IMAGE,
          height: IMAGE,
          scale: interpolate(frame, [pop, pop + POP_LEN], [0, 1], {
            ...clamp,
            easing: Easing.spring({ damping: 10 }),
            output: "perceptual-scale",
          }),
        }}
      />
    </Interactive.Div>
  );
};

export const FoodVideo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, fontFamily, direction: "rtl" }}>
      {FOODS.map((food, i) => {
        const s = SPOT_START + i * SPOT_LEN;
        return (
          <AbsoluteFill key={food.name}>
            <Interactive.Div
              name={`${food.name} Background`}
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: food.bg,
                opacity: interpolate(frame, [s, s + SPOT_MOVE, s + SPOT_LEN - SPOT_MOVE, s + SPOT_LEN], [0, 1, 1, 0], {
                  ...clamp,
                  easing: ease,
                }),
              }}
            />
            <Interactive.Div
              name={`${food.name} Title`}
              style={{
                position: "absolute",
                top: 790,
                left: 0,
                right: 0,
                textAlign: "center",
                fontSize: 130,
                fontWeight: 900,
                color: "white",
                zIndex: 3,
                opacity: interpolate(frame, [s + 12, s + 22, s + 46, s + 56], [0, 1, 1, 0], clamp),
                translate: interpolate(frame, [s + 12, s + 22], ["0px 60px", "0px 0px"], {
                  ...clamp,
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                }),
              }}
            >
              {food.name}
            </Interactive.Div>
          </AbsoluteFill>
        );
      })}
      {FOODS.map((food, i) => (
        <FoodItem key={food.name} food={food} i={i} />
      ))}
      <Interactive.Div
        name="Final Title"
        style={{
          position: "absolute",
          top: 790,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 110,
          fontWeight: 900,
          color: "#2B2D42",
          opacity: interpolate(frame, [TO_ROW_END - 5, TO_ROW_END + 10], [0, 1], clamp),
          translate: interpolate(frame, [TO_ROW_END - 5, TO_ROW_END + 10], ["0px 50px", "0px 0px"], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
        }}
      >
        פיצה, המבורגר וסושי
      </Interactive.Div>
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="FoodVideo"
      component={FoodVideo}
      durationInFrames={DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
