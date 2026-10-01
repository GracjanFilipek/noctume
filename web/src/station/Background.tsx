import { memo } from "react";
import { STAGE_H, STAGE_W } from "./layout.ts";

/**
 * L0 space, L1 nebula, L2 planet + passing ship — verbatim from Main.dc.html.
 * "Tło szepcze": loops ≥ 20 s, no red or amber. The planet's shadow would show the orbital cycle,
 * which the game does not have, so it stays a still decoration.
 */
export const Background = memo(function Background() {
  return (
    // Full-bleed: "slice" fills the whole scene area (no letterbox bars); the hull above is fitted separately.
    <svg className="station-backdrop" viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="mSpace" cx="0.62" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#13261C" />
          <stop offset="0.5" stopColor="#0A150F" />
          <stop offset="1" stopColor="#060907" />
        </radialGradient>
        <radialGradient id="mPlanet" cx="0.28" cy="0.18" r="0.9">
          <stop offset="0" stopColor="#7C7A48" />
          <stop offset="0.45" stopColor="#3B4428" />
          <stop offset="1" stopColor="#0E130C" />
        </radialGradient>
        <linearGradient id="mNight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.35" stopColor="#040604" stopOpacity="0" />
          <stop offset="0.62" stopColor="#040604" stopOpacity="0.82" />
          <stop offset="1" stopColor="#040604" stopOpacity="0.92" />
        </linearGradient>
        <filter id="mNeb" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="46" />
        </filter>
        <filter id="mSoft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="mPlanetClip">
          <circle cx="1000" cy="1320" r="640" />
        </clipPath>
      </defs>
      <rect width={STAGE_W} height={STAGE_H} fill="url(#mSpace)" />
      <g filter="url(#mNeb)">
        <ellipse cx="860" cy="150" rx="280" ry="150" fill="#1E5A3A" opacity="0.5" />
        <ellipse cx="1050" cy="310" rx="170" ry="130" fill="#C98A4B" opacity="0.14" />
        <ellipse cx="140" cy="230" rx="230" ry="150" fill="#155048" opacity="0.42" />
        <ellipse cx="440" cy="60" rx="220" ry="70" fill="#23432B" opacity="0.5" />
        <ellipse cx="320" cy="520" rx="200" ry="120" fill="#1A3322" opacity="0.4" />
      </g>
      <g className="at-far" fill="#E8EEE4">
        {STARS.map(([cx, cy, r, o], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} opacity={o} />
        ))}
        <path className="at-twinkle" d="M471 22 L473 30 L481 32 L473 34 L471 42 L469 34 L461 32 L469 30 Z" />
        <path className="at-twinkle" style={{ animationDelay: "1.1s" }} d="M934 76 L936 84 L944 86 L936 88 L934 96 L932 88 L924 86 L932 84 Z" />
        <path className="at-twinkle" style={{ animationDelay: "2.2s" }} d="M64 444 L66 452 L74 454 L66 456 L64 464 L62 456 L54 454 L62 452 Z" />
        <path className="at-twinkle" style={{ animationDelay: "0.6s" }} d="M1040 394 L1042 402 L1050 404 L1042 406 L1040 414 L1038 406 L1030 404 L1038 402 Z" />
      </g>
      <g className="at-ship">
        <g transform="translate(0 40)">
          <path d="M0 4 L8 0 H22 L26 4 L22 8 H8 Z" fill="#28382F" />
          <rect x="4" y="3" width="6" height="2" fill="#D8E4C6" opacity="0.8" />
          <circle cx="27" cy="4" r="2.6" fill="#7BE495" opacity="0.7" />
        </g>
      </g>
      <circle cx="1000" cy="1320" r="652" fill="none" stroke="#B5F2C6" strokeOpacity="0.18" strokeWidth="16" filter="url(#mSoft)" />
      <circle cx="1000" cy="1320" r="640" fill="url(#mPlanet)" />
      <g clipPath="url(#mPlanetClip)">
        <ellipse cx="880" cy="740" rx="460" ry="22" fill="#D8E4C6" opacity="0.08" />
        <ellipse cx="960" cy="794" rx="420" ry="16" fill="#D8E4C6" opacity="0.06" />
        <rect x="360" y="660" width="760" height="200" fill="url(#mNight)" />
        <g fill="#D8E4C6" opacity="0.55">
          <circle cx="1036" cy="742" r="1.2" />
          <circle cx="1052" cy="760" r="1" />
          <circle cx="1080" cy="736" r="1.3" />
          <circle cx="1098" cy="768" r="1" />
          <circle cx="1010" cy="790" r="1.1" />
        </g>
      </g>
      <circle cx="1000" cy="1320" r="640" fill="none" stroke="#B5F2C6" strokeOpacity="0.5" strokeWidth="1.5" />
      <g className="at-near" fill="#AAB9AE" opacity="0.3">
        <circle cx="160" cy="120" r="2" />
        <circle cx="620" cy="300" r="1.6" />
        <circle cx="880" cy="520" r="2.2" />
        <circle cx="420" cy="690" r="1.8" />
        <circle cx="1060" cy="220" r="1.6" />
      </g>
    </svg>
  );
});

const STARS: [number, number, number, number][] = [
  [42, 38, 1.2, 0.8], [118, 96, 0.9, 0.6], [205, 24, 1.4, 0.9], [266, 132, 0.8, 0.5], [338, 58, 1.1, 0.7],
  [402, 168, 0.9, 0.5], [540, 118, 0.8, 0.6], [612, 64, 1.2, 0.8], [688, 20, 0.9, 0.5], [744, 110, 1.3, 0.9],
  [812, 48, 0.8, 0.6], [866, 176, 1.1, 0.7], [1002, 30, 0.9, 0.6], [1068, 140, 1.2, 0.8], [1096, 318, 0.9, 0.6],
  [22, 300, 1, 0.6], [18, 610, 0.9, 0.6], [96, 790, 1.2, 0.7], [230, 812, 0.8, 0.5], [372, 770, 1.1, 0.7],
  [505, 808, 0.9, 0.6], [298, 452, 0.8, 0.4], [820, 330, 0.9, 0.5], [1086, 540, 0.8, 0.5], [660, 250, 0.8, 0.4],
  [96, 520, 0.9, 0.5],
];
