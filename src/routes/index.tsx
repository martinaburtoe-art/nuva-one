import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HomeFixedExperience } from "@/components/home-fixed-experience";
import "@/home-cinematic-editorial-v2.css";
import "@/home-cinematic-media.css";
import "@/home-cinematic-performance.css";
import "@/home-cinematic-transition.css";
import "@/home-experience.css";


const FAQ_ITEMS = [
  { q: "¿Cómo protege Nüva la información de mi negocio?", a: "Nüva One utiliza autenticación, controles de acceso y aislamiento de información por negocio. La protección de datos se aborda por capas; antes de contratar, revisa nuestros términos y política de privacidad para conocer el alcance y las condiciones aplicables." },
  { q: "¿Necesito tarjeta de crédito para probarlo?", a: "No. La oferta de prueba publicada contempla 15 días sin tarjeta de crédito. Puedes explorar la plataforma antes de elegir un plan." },
  { q: "¿Para qué tipo de empresa está pensado?", a: "El foco inicial está en distribuidoras y comercios que gestionan productos, inventario, pedidos, clientes y cobranza. Otros rubros pueden evaluar su encaje según sus procesos y necesidades." },
  { q: "¿La demostración utiliza información real?", a: "No. La demo pública utiliza datos ficticios para que puedas recorrer la experiencia sin acceder a información de clientes ni modificar un negocio real." },
  { q: "¿Tengo que contratar todos los módulos?", a: "No. Puedes comenzar con el plan que corresponda al tamaño y la complejidad de tu operación. Revisa los límites y funcionalidades de cada plan antes de contratar." },
  { q: "¿Puedo cancelar?", a: "Revisa las condiciones de contratación y cancelación en nuestros términos vigentes. No queremos que tomes una decisión sin conocerlas." },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "SoftwareApplication", name: "Nüva One", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: "https://nuva-one.vercel.app", description: "Plataforma de gestión para distribuidoras y comercios en crecimiento: ventas, inventario, clientes, cotizaciones y finanzas conectadas." },
    { "@type": "Organization", name: "Nüva One", url: "https://nuva-one.vercel.app" },
    { "@type": "FAQPage", mainEntity: FAQ_ITEMS.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nüva One — Gestión conectada para distribuidoras y comercios" },
      { name: "description", content: "Conecta ventas, inventario, clientes, cotizaciones y finanzas en una plataforma para distribuidoras y comercios en crecimiento. Explora la demo y conoce los planes." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CL" },
      { property: "og:title", content: "Nüva One — Gestión conectada para distribuidoras y comercios" },
      { property: "og:description", content: "Ventas, inventario, clientes, cotizaciones y finanzas con más contexto para decidir." },
    ],
    links: [{ rel: "canonical", href: "https://nuva-one.vercel.app/" }],
  }),
  component: Landing,
});

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080809]/85 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
        <Link to="/" className="text-lg font-semibold tracking-tight">Nüva One</Link>
        <nav className="hidden items-center gap-6 text-sm text-white/65 md:flex" aria-label="Navegación principal">
          <a href="#para-quien" className="transition-colors hover:text-white">Para quién</a>
          <a href="#demo" className="transition-colors hover:text-white">Producto y demo</a>
          <Link to="/pricing" className="transition-colors hover:text-white">Precios</Link>
          <a href="#faq" className="transition-colors hover:text-white">Preguntas</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-xs font-semibold text-white/70 transition-colors hover:text-white sm:inline-flex">Ingresar</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-full bg-[#E6C687] px-4 py-2 text-xs font-bold text-[#080809]">Probar gratis</Link>
          <button type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 md:hidden">
            <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
            <span className="text-lg">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-white/10 bg-[#080809]/95 px-5 py-4 backdrop-blur-xl md:hidden" aria-label="Menú móvil">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm">
            <a href="#para-quien" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Para quién</a>
            <a href="#demo" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Producto y demo</a>
            <Link to="/pricing" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Precios</Link>
            <a href="#faq" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Preguntas frecuentes</a>
            <Link to="/auth" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Ingresar</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

function FAQ() {
  return (
    <section id="faq" className="cinematic-faq">
      <div className="cinematic-faq__inner">
        <div className="cinematic-faq__intro">
          <Badge variant="secondary">Preguntas frecuentes</Badge>
          <h2>Lo que necesitas saber.</h2>
          <p>Una experiencia para equipos que necesitan mantener ventas, productos, clientes y finanzas en contexto.</p>
        </div>
        <Accordion type="single" collapsible>
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={item.q} value={`item-${index}`}>
              <AccordionTrigger>{item.q}</AccordionTrigger>
              <AccordionContent>{item.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="cinematic-final-cta">
      <div>
        <span>14 / NÜVA ONE</span>
        <h2>Menos fragmentación.<br /><em>Más control.</em></h2>
        <p>Explora la demo con datos ficticios, revisa los planes y comprueba si Nüva One encaja con la operación de tu empresa.</p>
        <div className="cinematic-final-cta__actions">
          <Link to="/auth" search={{ mode: "signup" }}>Empezar gratis</Link>
          <Link to="/pricing">Ver planes</Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="cinematic-footer">
      <span>Nüva One</span>
      <nav aria-label="Enlaces legales y comerciales" className="flex flex-wrap items-center gap-4 text-xs">
        <Link to="/pricing">Planes</Link>
        <Link to="/privacy">Privacidad</Link>
        <Link to="/terms">Términos</Link>
      </nav>
      <span>© {new Date().getFullYear()} Nüva One. Todos los derechos reservados.</span>
    </footer>
  );
}

function Landing() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(STRUCTURED_DATA);
    document.head.appendChild(script);
    return () => script.remove();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" data-release="factory-learning-loop-2026-09">
      <Nav />
      <main>
        <HomeFixedExperience />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}