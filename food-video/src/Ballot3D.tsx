import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { fontFamily } from "./fonts";
import { FPS, HEIGHT, WIDTH } from "./IranVideo";

// 3D version of the ballot-slips + threshold-chart segment (3.0s – 17.8s of
// the voice-over). All motion is driven by absolute time in seconds.

const NAVY = "#0B1B3F";
const BADGE = "#1A3478";
const YELLOW = "#FFD60A";
const RED = "#FF4D5E";
const PAPER = "#F4F6FA";
const GREEN_PAPER = "#2FCB5E";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.65, 0, 0.35, 1);
const outExpo = Easing.bezier(0.16, 1, 0.3, 1);
const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);

// Piecewise tween over absolute seconds.
const tw = (t: number, times: number[], values: number[], easing = smooth) =>
  interpolate(t, times, values, { ...clamp, easing });

type Vec3 = [number, number, number];

/* ---------- text drawn to a texture once the font has loaded ---------- */

const TextPlane: React.FC<{ text: string; color: string; height: number; position?: Vec3 }> = ({
  text,
  color,
  height,
  position = [0, 0, 0],
}) => {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  const [aspect, setAspect] = useState(1);
  const [handle] = useState(() => delayRender(`3D text "${text}"`));
  const advance = useThree((state) => state.advance);
  // The canvas only redraws on frame changes, so redraw once the texture is in.
  useEffect(() => {
    if (!texture) return;
    advance(performance.now());
    requestAnimationFrame(() => continueRender(handle));
  }, [texture, advance, handle]);
  useEffect(() => {
    const font = `900 200px ${fontFamily}`;
    document.fonts.load(font).then(() => {
      const ctx0 = document.createElement("canvas").getContext("2d")!;
      ctx0.font = font;
      const w = Math.ceil(ctx0.measureText(text).width) + 40;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = 260;
      const ctx = canvas.getContext("2d")!;
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, w / 2, 140);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      setAspect(w / 260);
      setTexture(tex);
    });
  }, [text, color]);
  if (!texture) return null;
  return (
    <mesh position={position}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial map={texture} transparent toneMapped={false} />
    </mesh>
  );
};

/* ---------- check mark drawn progressively ---------- */

const CheckStroke: React.FC<{ progress: number; color: string; scale?: number; z?: number }> = ({
  progress,
  color,
  scale = 1,
  z = 0,
}) => {
  const geometry = useMemo(() => {
    const path = new THREE.CurvePath<THREE.Vector3>();
    const a = new THREE.Vector3(-0.36, 0.0, 0);
    const b = new THREE.Vector3(-0.1, -0.26, 0);
    const c = new THREE.Vector3(0.4, 0.32, 0);
    path.add(new THREE.LineCurve3(a, b));
    path.add(new THREE.LineCurve3(b, c));
    return new THREE.TubeGeometry(path, 64, 0.055, 12, false);
  }, []);
  const count = geometry.index ? geometry.index.count : 0;
  geometry.setDrawRange(0, Math.floor((count * progress) / 3) * 3);
  return (
    <mesh geometry={geometry} scale={scale} position={[0, 0, z]}>
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
};

/* ---------- paper ballot slip ---------- */

const Slip: React.FC<{
  kind: "white" | "green";
  n: number;
  position: Vec3;
  rotation: Vec3;
  scale: number;
  check: number;
}> = ({ kind, n, position, rotation, scale, check }) => (
  <group position={position} rotation={rotation} scale={Math.max(scale, 0.0001)} visible={scale > 0.001}>
    <RoundedBox args={[1.3, 1.69, 0.03]} radius={0.012} smoothness={4} castShadow>
      <meshPhysicalMaterial color={kind === "white" ? PAPER : GREEN_PAPER} roughness={0.75} sheen={0.4} />
    </RoundedBox>
    {[0.62, 0.48, 0.32].map((w, i) => (
      <mesh key={w} position={[0, 0.25 - i * 0.22, 0.017]}>
        <boxGeometry args={[w, 0.07, 0.002]} />
        <meshStandardMaterial color={NAVY} transparent opacity={0.22} />
      </mesh>
    ))}
    <group position={[0.56, 0.76, 0.03]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 48]} />
        <meshStandardMaterial color={BADGE} roughness={0.35} />
      </mesh>
      <TextPlane text={String(n)} color="#FFFFFF" height={0.34} position={[0, 0, 0.025]} />
    </group>
    {check > 0 ? <CheckStroke progress={check} color={NAVY} scale={1.15} z={0.03} /> : null}
  </group>
);

/* ---------- verdict badge (check / X) ---------- */

const Verdict: React.FC<{ ok: boolean; position: Vec3; t: number; at: number; until?: number }> = ({
  ok,
  position,
  t,
  at,
  until = Infinity,
}) => {
  const pop = tw(t, [at, at + 0.45], [0, 1], Easing.spring({ damping: 11 }));
  const gone = until === Infinity ? 1 : tw(t, [until, until + 0.2], [1, 0]);
  const s = pop * gone;
  return (
    <group position={position} scale={Math.max(s, 0.0001)} visible={s > 0.001} rotation={[0, 0, (1 - pop) * 0.6]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.08, 64]} />
        <meshPhysicalMaterial color={ok ? YELLOW : RED} roughness={0.25} clearcoat={1} />
      </mesh>
      {ok ? (
        <CheckStroke progress={1} color={NAVY} scale={0.7} z={0.05} />
      ) : (
        <>
          {[1, -1].map((d) => (
            <mesh key={d} position={[0, 0, 0.05]} rotation={[0, 0, (d * Math.PI) / 4]}>
              <boxGeometry args={[0.46, 0.09, 0.03]} />
              <meshStandardMaterial color="white" />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

/* ---------- camera ---------- */

const CameraRig: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const chart = tw(t, [11.2, 12.2], [0, 1]);
  const x = Math.sin(t * 0.25) * 0.5 * (1 - chart) + (0.5 + Math.sin(t * 0.3) * 0.35) * chart;
  const y = 1.55 + chart * 1.4;
  const z = 6.4 + chart * 2.3 - tw(t, [3.0, 5.0], [0.8, 0], outExpo);
  camera.position.set(x, y, z);
  camera.lookAt(0, 1.3 - chart * 0.15, 0);
  return null;
};

/* ---------- the scene ---------- */

const PARTY1_X = 1.15; // first choice on the right (RTL)
const PARTY2_X = -1.15;
const THRESHOLD_Y = 1.6;
const PARK_W: Vec3 = [3.05, 3.05, 0.3];
const PARK_G: Vec3 = [-3.05, 3.05, 0.3];

const lerp3 = (a: Vec3, b: Vec3, u: number): Vec3 => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];

// Arc flight from a to b over [t0, t1].
const fly = (t: number, t0: number, t1: number, a: Vec3, b: Vec3, arc = 0.9) => {
  const u = tw(t, [t0, t1], [0, 1]);
  const p = lerp3(a, b, u);
  p[1] += Math.sin(Math.PI * u) * arc;
  return { p, u };
};

const Scene: React.FC<{ t: number }> = ({ t }) => {
  const bob = Math.sin(t * 2.2) * 0.05;

  // Bars
  const h1 = Math.max(0.0001, interpolate(t, [12.2, 13.0, 14.2, 14.5, 15.0, 15.6], [0, 2.6, 2.6, 0, 0, 1.0], { ...clamp, easing: outExpo }));
  const h2 = Math.max(0.0001, tw(t, [14.5, 15.0], [0, 2.3], outExpo));
  const glow1 = tw(t, [12.9, 13.2, 13.8], [0, 0.6, 0.15]) * (t < 14.2 ? 1 : 0);
  const glow2 = tw(t, [16.8, 17.1, 17.6], [0, 0.45, 0.15]);
  const chartRise = tw(t, [11.2, 11.9], [-3.2, 0], outExpo);

  // White slip
  let wPos: Vec3 = [0, 1.35, 0];
  let wRot: Vec3 = [0, tw(t, [3.1, 3.7], [-0.7, 0], outExpo), 0];
  let wScale = tw(t, [3.1, 3.6], [0, 1], outBack);
  if (t >= 4.8) {
    wPos = [tw(t, [4.8, 5.3], [0, 1.35]), 1.35, 0];
    wRot = [0, tw(t, [4.8, 5.3], [0, -0.25]), 0];
  }
  if (t >= 5.4) {
    const u = tw(t, [5.4, 6.0], [0, 1]);
    wPos = lerp3([1.35, 1.35, 0], [0, 1.4, 1.7], u);
    wRot = [0, -0.25 * (1 - u), 0];
  }
  if (t >= 8.0) {
    const u = tw(t, [8.0, 8.6], [0, 1]);
    wPos = lerp3([0, 1.4, 1.7], [1.5, 1.35, 0], u);
    wRot = [0, -0.25 * u, 0];
  }
  if (t >= 11.2) {
    const u = tw(t, [11.2, 11.7], [0, 1]);
    wPos = lerp3([1.5, 1.35, 0], PARK_W, u);
    wPos[1] += bob * u;
    wRot = [0, -0.25 - 0.1 * u, 0];
    wScale = 1 - 0.5 * u;
  }
  if (t >= 12.0) {
    const { p, u } = fly(t, 12.0, 12.6, PARK_W, [PARTY1_X, 0.3, 0]);
    wPos = p;
    wRot = [-Math.PI / 2 * u, -0.35 * (1 - u), 0];
    wScale = (0.5 - 0.2 * u) * (t < 12.6 ? 1 : 0);
  }
  if (t >= 14.4) {
    wPos = [PARK_W[0], PARK_W[1] + bob, PARK_W[2]];
    wRot = [0, -0.35, 0];
    wScale = tw(t, [14.4, 14.6], [0, 0.5], outBack);
  }
  if (t >= 14.9) {
    const { p, u } = fly(t, 14.9, 15.4, PARK_W, [PARTY1_X, 0.3, 0]);
    wPos = p;
    wRot = [-Math.PI / 2 * u, -0.35 * (1 - u), 0];
    wScale = (0.5 - 0.2 * u) * (t < 15.4 ? 1 : 0);
  }

  // Green slip
  let gPos: Vec3 = [tw(t, [4.8, 5.3], [0, -1.35]), 1.35, -0.05];
  let gRot: Vec3 = [0, tw(t, [4.8, 5.3], [0, 0.25]), 0];
  let gScale = t < 4.8 ? 0 : 1;
  if (t >= 5.4) {
    const u = tw(t, [5.4, 6.0], [0, 1]);
    gPos = lerp3([-1.35, 1.35, -0.05], [-2.6, 1.3, -1.8], u);
  }
  if (t >= 9.0) {
    const u = tw(t, [9.0, 9.6], [0, 1], outExpo);
    gPos = lerp3([-2.6, 1.3, -1.8], [-1.5, 1.35, 0], u);
  }
  if (t >= 11.2) {
    const u = tw(t, [11.2, 11.7], [0, 1]);
    gPos = lerp3([-1.5, 1.35, 0], PARK_G, u);
    gPos[1] += bob * u;
    gRot = [0, 0.25 + 0.1 * u, 0];
    gScale = 1 - 0.5 * u;
  }
  if (t >= 16.2) {
    const { p, u } = fly(t, 16.2, 16.9, PARK_G, [PARTY2_X, 2.4, 0], 1.0);
    gPos = p;
    gRot = [-Math.PI / 2 * u, 0.35 * (1 - u), 0];
    gScale = (0.5 - 0.2 * u) * (t < 16.9 ? 1 : 0);
  }

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[4, 8, 6]}
        intensity={3.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <directionalLight position={[-6, 4, -4]} intensity={1.4} color="#7FB2FF" />
      <pointLight position={[0, 3, 3]} intensity={6} distance={9} color="#FFE7B0" />
      <Environment resolution={256} environmentIntensity={1.3}>
        <Lightformer form="rect" intensity={2.2} position={[0, 5, -6]} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#9CC3FF" position={[-6, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color={YELLOW} position={[5, 3, 3]} scale={2} />
      </Environment>
      <CameraRig t={t} />

      {/* Infinite studio: soft contact shadows over the 2D backdrop */}
      <ContactShadows position={[0, -0.17, 0]} opacity={0.6} scale={16} blur={2.6} far={6} color="#020A24" />

      {/* Chart */}
      <group position={[0, chartRise, 0]} visible={t >= 11.2}>
        <RoundedBox args={[7.4, 0.16, 3.0]} radius={0.06} position={[0, -0.08, 0]} receiveShadow castShadow>
          <meshPhysicalMaterial color="#13306F" roughness={0.35} metalness={0.3} clearcoat={0.6} />
        </RoundedBox>
        <group position={[PARTY1_X, 0, 0]}>
          <RoundedBox args={[1.2, 1, 1.2]} radius={0.04} position={[0, h1 / 2, 0]} scale={[1, h1, 1]} visible={h1 > 0.01} castShadow>
            <meshPhysicalMaterial color="#F2F5FB" roughness={0.3} clearcoat={0.8} emissive="#FFF4C2" emissiveIntensity={glow1} />
          </RoundedBox>
        </group>
        <group position={[PARTY2_X, 0, 0]}>
          <RoundedBox args={[1.2, 1, 1.2]} radius={0.04} position={[0, h2 / 2, 0]} scale={[1, h2, 1]} visible={h2 > 0.01} castShadow>
            <meshPhysicalMaterial color={GREEN_PAPER} roughness={0.3} clearcoat={0.8} emissive="#7CFFA6" emissiveIntensity={glow2} />
          </RoundedBox>
        </group>
        {/* Glass threshold plane */}
        <mesh position={[0, THRESHOLD_Y, 0]}>
          <boxGeometry args={[7.0, 0.02, 2.7]} />
          <meshPhysicalMaterial color={YELLOW} transparent opacity={0.2} roughness={0.15} depthWrite={false} />
        </mesh>
        <mesh position={[0, THRESHOLD_Y, 1.35]}>
          <boxGeometry args={[7.0, 0.035, 0.035]} />
          <meshStandardMaterial color={YELLOW} emissive={YELLOW} emissiveIntensity={1.2} />
        </mesh>
        <group position={[3.2, THRESHOLD_Y + 0.32, 1.4]} scale={tw(t, [12.0, 12.4], [0.0001, 1], outBack)}>
          <RoundedBox args={[1.25, 0.42, 0.06]} radius={0.08}>
            <meshStandardMaterial color={YELLOW} />
          </RoundedBox>
          <TextPlane text="3.25%" color={NAVY} height={0.36} position={[0, 0, 0.035]} />
        </group>
        <Verdict ok position={[PARTY1_X, 2.6 + 0.65, 0.4]} t={t} at={13.4} until={14.2} />
        <Verdict ok={false} position={[PARTY1_X, 1.0 + 0.6, 0.7]} t={t} at={15.5} />
        <Verdict ok position={[PARTY2_X, 2.3 + 0.65, 0.4]} t={t} at={17.0} />
      </group>

      {/* Slips */}
      <Slip kind="green" n={2} position={gPos} rotation={gRot} scale={gScale} check={tw(t, [10.2, 10.7], [0, 1], outExpo)} />
      <Slip kind="white" n={1} position={wPos} rotation={wRot} scale={wScale} check={tw(t, [7.2, 7.7], [0, 1], outExpo)} />
    </>
  );
};

export const Ballot3D: React.FC<{ offsetFrames: number; endSec: number }> = ({ offsetFrames, endSec }) => {
  const frame = useCurrentFrame();
  const t = (frame + offsetFrames) / FPS;
  const start = offsetFrames / FPS;
  return (
    <AbsoluteFill style={{ opacity: interpolate(t, [start, start + 0.2, endSec - 0.25, endSec], [0, 1, 1, 0], clamp) }}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} shadows gl={{ antialias: true, alpha: true }} camera={{ fov: 35, near: 0.1, far: 100 }}>
        <Scene t={t} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
