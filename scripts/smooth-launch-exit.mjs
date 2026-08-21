import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("src/components/nuva-launch-experience.tsx");
let source = readFileSync(file, "utf8");

// The launch overlay must exist in the very first SSR render. Otherwise the
// browser can paint the Home for a frame before React hydrates the intro.
const hiddenState = 'const [visible,setVisible]=useState(false)';
const visibleState = 'const [visible,setVisible]=useState(true)';
if (source.includes(hiddenState)) {
  source = source.replace(hiddenState, visibleState);
}

// Keep the premium exit override idempotent.
const marker = "/* NÜVA SMOOTH EXIT OVERRIDE */";
if (!source.includes(marker)) {
  const css = `
          ${marker}
          .nuva-launch--exit{animation:nuva-smooth-scene-exit 1450ms cubic-bezier(.22,1,.36,1) forwards!important;transform:translateZ(0)!important;filter:none!important}
          .nuva-launch--exit .nuva-launch__welcome{animation:nuva-smooth-welcome-exit 1250ms cubic-bezier(.22,1,.36,1) forwards!important;filter:none!important}
          .nuva-launch--exit .nuva-launch__ambient{animation:nuva-smooth-ambient-exit 1450ms cubic-bezier(.22,1,.36,1) forwards!important;filter:none!important}
          .nuva-launch--exit .nuva-launch__grid,.nuva-launch--exit .nuva-launch__light-beam,.nuva-launch--exit .nuva-launch__ring,.nuva-launch--exit .nuva-launch__orbit,.nuva-launch--exit .nuva-launch__core,.nuva-launch--exit .nuva-launch__tagline{opacity:0!important;filter:none!important;transform:none!important;transition:opacity 1200ms cubic-bezier(.22,1,.36,1)!important}
          .nuva-launch--exit .nuva-launch__module{filter:none!important}
          @keyframes nuva-smooth-scene-exit{0%{opacity:1;transform:translateZ(0) scale(1);filter:none}62%{opacity:.72;transform:translateZ(0) scale(1.002);filter:none}100%{opacity:0;transform:translateZ(0) scale(1.006);filter:none}}
          @keyframes nuva-smooth-welcome-exit{0%{opacity:1;transform:translate(-50%,-50%) scale(1);filter:none}58%{opacity:.62;transform:translate(-50%,-50%) scale(1.002);filter:none}100%{opacity:0;transform:translate(-50%,-50%) scale(1.006);filter:none}}
          @keyframes nuva-smooth-ambient-exit{0%{opacity:1;transform:scale(1);filter:none}60%{opacity:.48;transform:scale(1.01);filter:none}100%{opacity:0;transform:scale(1.018);filter:none}}
          @media (prefers-reduced-motion:reduce){.nuva-launch--exit,.nuva-launch--exit .nuva-launch__welcome,.nuva-launch--exit .nuva-launch__ambient{animation:none!important;opacity:0!important;transition:none!important}}
`;
  const needle = "`}</style>";
  if (!source.includes(needle)) throw new Error("Launch inline style anchor not found");
  source = source.replace(needle, `${css}\n\`}</style>`);
}

writeFileSync(file, source, "utf8");
