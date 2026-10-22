import { AbsoluteFill, Composition, interpolate } from "remotion";
import { clamp, FPS, HEIGHT, WIDTH } from "./IranVideo";
import {
  CREAM,
  Cutout,
  handFamily,
  INK,
  jitter,
  outBack,
  PaperBackdrop,
  PaperFilters,
  PAPER_WHITE,
  RED,
  s,
  Tape,
  useStep,
} from "./PaperBallot";

// Paper-cutout political caricature with a speech bubble. The "satire" label is
// part of the bubble itself, so the line can't be cropped away from it.

const SKIN = "#E9B98F";
const HAIR = "#ECEAE6";
const SUIT = "#1F2737";
const TIE = "#2E5FA8";

const LINE = "פוצץ, אין בחירות";
const LABEL = "סאטירה · לא ציטוט אמיתי";
const DURATION = 4 * FPS;

const Caricature: React.FC = () => {
  const frame = useStep();
  // Mouth flaps on twos while "speaking" (0.7s – 2.1s).
  const talking = frame >= s(0.7) && frame < s(2.1);
  const open = talking && Math.floor(frame / 4) % 2 === 0;
  const blink = frame % 54 < 4;
  const brow = talking ? -6 : 0;
  return (
    <div style={{ position: "relative", width: 560, height: 760, rotate: `${jitter(frame, 3, 0.8)}deg` }}>
      {/* Suit, shirt and tie */}
      <div style={{ position: "absolute", left: 20, top: 470 }}>
        <Cutout color={SUIT} style={{ width: 520, height: 330, borderRadius: "200px 200px 20px 20px" }} />
      </div>
      <div style={{ position: "absolute", left: 210, top: 470 }}>
        <Cutout color={PAPER_WHITE} style={{ width: 140, height: 200, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
      </div>
      <div style={{ position: "absolute", left: 255, top: 500 }}>
        <Cutout color={TIE} style={{ width: 50, height: 170, clipPath: "polygon(20% 0, 80% 0, 100% 80%, 50% 100%, 0 80%)" }} />
      </div>
      {/* Ears */}
      {[60, 440].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 220 }}>
          <Cutout color={SKIN} style={{ width: 70, height: 110, borderRadius: "50%" }} />
        </div>
      ))}
      {/* Head */}
      <div style={{ position: "absolute", left: 90, top: 60 }}>
        <Cutout color={SKIN} style={{ width: 380, height: 450, borderRadius: "46% 46% 44% 44%" }} />
      </div>
      {/* Hair: swept white top and sides */}
      <div style={{ position: "absolute", left: 95, top: 30, rotate: "-6deg" }}>
        <Cutout color={HAIR} style={{ width: 360, height: 150, borderRadius: "60% 70% 30% 40%" }} />
      </div>
      {[70, 410].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 120 }}>
          <Cutout color={HAIR} style={{ width: 80, height: 150, borderRadius: "40%" }} />
        </div>
      ))}
      {/* Brows */}
      {[170, 300].map((x, i) => (
        <div key={x} style={{ position: "absolute", left: x, top: 225 + brow, rotate: `${i === 0 ? 8 : -8}deg` }}>
          <Cutout color={HAIR} style={{ width: 90, height: 24, borderRadius: 12 }} />
        </div>
      ))}
      {/* Eyes */}
      {[185, 315].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 265 }}>
          <Cutout color={INK} style={{ width: 54, height: blink ? 8 : 40, borderRadius: "50%" }} />
        </div>
      ))}
      {/* Nose */}
      <div style={{ position: "absolute", left: 250, top: 300 }}>
        <Cutout color="#D9A27A" style={{ width: 70, height: 100, borderRadius: "40% 40% 50% 50%" }} />
      </div>
      {/* Mouth */}
      <div style={{ position: "absolute", left: 220, top: open ? 410 : 425 }}>
        <Cutout color="#5A1E1E" style={{ width: 120, height: open ? 70 : 18, borderRadius: open ? "40% 40% 50% 50%" : 9 }} />
      </div>
    </div>
  );
};

const Bubble: React.FC = () => {
  const frame = useStep();
  const pop = interpolate(frame, [s(0.5), s(0.5) + 10], [0, 1], { ...clamp, easing: outBack });
  if (pop <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 210, top: 140, scale: pop, rotate: `${-3 + jitter(frame, 9, 0.8)}deg`, transformOrigin: "100% 100%" }}>
      <div style={{ position: "relative", width: 900, height: 470 }}>
        <Cutout color={PAPER_WHITE} style={{ width: 900, height: 420, borderRadius: 210 }}>
          <div
            style={{
              position: "absolute",
              inset: "0 60px 70px 60px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontFamily: handFamily,
              fontWeight: 700,
              fontSize: 170,
              color: INK,
              direction: "rtl",
            }}
          >
            {LINE}
          </div>
          {/* Satire label, printed into the bubble */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 54, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                backgroundColor: RED,
                color: PAPER_WHITE,
                fontFamily: handFamily,
                fontWeight: 700,
                fontSize: 58,
                padding: "2px 30px",
                borderRadius: 6,
                direction: "rtl",
              }}
            >
              {LABEL}
            </div>
          </div>
          <Tape x={380} y={-18} rotate={3} width={140} />
        </Cutout>
        {/* Tail pointing at the speaker */}
        <div style={{ position: "absolute", left: 700, top: 370, rotate: "-20deg" }}>
          <Cutout color={PAPER_WHITE} style={{ width: 120, height: 130, clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
        </div>
      </div>
    </div>
  );
};

export const SatireCard: React.FC = () => {
  const frame = useStep();
  const enter = interpolate(frame, [0, 10], [0, 1], { ...clamp, easing: outBack });
  return (
    <AbsoluteFill style={{ backgroundColor: CREAM, overflow: "hidden" }}>
      <PaperFilters />
      <PaperBackdrop />
      <div style={{ position: "absolute", left: 1220, top: 300, translate: `0px ${(1 - enter) * 500}px` }}>
        <Caricature />
      </div>
      <Bubble />
    </AbsoluteFill>
  );
};

export const SatireComposition = () => (
  <Composition id="PaperSatireBibi" component={SatireCard} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
