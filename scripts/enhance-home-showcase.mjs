import { readFileSync, writeFileSync } from "node:fs";

const indexPath = "src/routes/index.tsx";
const text = readFileSync(indexPath, "utf8");

const oldHint =
  "Explora los módulos principales y descubre, de un vistazo, cómo puedes gestionar tu negocio desde un solo lugar.";
const newHint =
  "Haz clic en cada módulo para ver una pequeña muestra de cómo Nüva One puede ayudarte a gestionar, analizar y hacer crecer tu PYME.";

const oldButton =
  'className={`rounded-xl px-3 py-2.5 text-left transition-all ${module === item.id ? "bg-primary/10 font-semibold text-primary shadow-soft" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}';
const newButton =
  'aria-label={`Ver una muestra del módulo ${item.label}`} className={`rounded-xl px-3 py-2.5 text-left transition-all ${module === item.id ? "bg-primary/10 font-semibold text-primary shadow-soft" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}';

const oldPreviewNote = "Previsualización del producto · Sin datos reales";
const newPreviewNote = "Previsualización del producto · Solo una muestra de la plataforma";

const oldCta =
  '<Link to="/demo"><Button size="sm">Explorar demo completa <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>';
const newCta =
  '<Link to="/demo"><Button size="sm">Descubrir todo Nüva One <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>';

let updated = text;
let changed = false;

if (updated.includes(oldHint)) {
  updated = updated.replace(oldHint, newHint);
  changed = true;
}

if (updated.includes(oldButton) && !updated.includes("aria-label={`Ver una muestra del módulo")) {
  updated = updated.replace(oldButton, newButton);
  changed = true;
}

if (updated.includes(oldPreviewNote)) {
  updated = updated.replace(oldPreviewNote, newPreviewNote);
  changed = true;
}

if (updated.includes(oldCta)) {
  updated = updated.replace(oldCta, newCta);
  changed = true;
}

if (changed) {
  writeFileSync(indexPath, updated, "utf8");
  console.log("Homepage showcase strengthened as a product preview");
} else {
  console.log(
    "Homepage showcase enhancements already applied or source changed; no modification needed",
  );
}
