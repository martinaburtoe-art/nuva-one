// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const homepageShowcasePlugin = {
  name: "nuva-homepage-showcase",
  enforce: "pre" as const,
  transform(code: string, id: string) {
    if (!id.endsWith("/src/routes/index.tsx")) return null;
    const start = code.indexOf("const SHOWCASE_TABS =");
    const end = code.indexOf("function DemoAndComparison");
    if (start === -1 || end === -1) return null;
    const importLine = 'import { HomeProductShowcase } from "@/components/home-product-showcase";\n';
    const transformed = code.slice(0, start) + "function ProductShowcase() { return <HomeProductShowcase />; }\n\n" + code.slice(end);
    return {
      code: transformed.includes("HomeProductShowcase") ? transformed : importLine + transformed,
      map: null,
    };
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Explicit Vercel preset: this project's Lovable sandbox defaults to Cloudflare Workers
  // output, which is incompatible with a Vercel deployment. Outside the Lovable sandbox
  // (i.e. on Vercel's own build servers) this override takes effect and produces a
  // standard Vercel Build Output API v3 bundle.
  nitro: { preset: "vercel" },
  vite: {
    plugins: [homepageShowcasePlugin],
  },
});