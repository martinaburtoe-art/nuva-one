import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HomeFixedExperience } from "@/components/home-fixed-experience";
import "@/home-cinematic-editorial-v2.css";
import "@/home-cinematic-media.css";
import "@/home-cinematic-performance.css";
import "@/home-cinematic-transition.css";


const FAQ_ITEMS = [
  { q: "¿Mis datos están seguros?", a: "Sí. Usamos cifrado en tránsito y en reposo, aislamiento por negocio con Row-Level Security, y cumplimos con la Ley 19.628 y Ley 21.719 de protección de datos personales en Chile." },
  { q: "¿Necesito tarjeta de crédito para empezar?", a: "No. Tienes 15 días de prueba gratuita con acceso completo, sin tarjeta." },
  { q: "¿Puedo conectar Instagram y Facebook?", a: "Sí, mediante tu propia cuenta de Meta Business. Te guiamos en la conexión." },
  { q: "¿Funciona para mi rubro?", a: "Sí. Nüva One está hecho para cualquier rubro: retail, servicios, manufactura, gastronomía, construcción, salud y más." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Sin contratos ni cargos por cancelación." },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "SoftwareApplication", name: "Nüva One", applicationCategory: "BusinessApplication", operatingSystem: "Web", url: "https://nuva-one.vercel.app", description: "Plataforma todo-en-uno para PYMEs: inventario, ventas, finanzas, cotizaciones y Nüva IA." },
    { "@type": "Organization", name: "Nüva One", url: "https://nuva-one.vercel.app" },
    { "@type": "FAQPage", mainEntity: FAQ_ITEMS.map((it) => ({ "@type": "Question", name: it.q, acceptedAnswer: { "@type": "Answer", text: it.a } })) },
  ],
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nüva One — La inteligencia de tu negocio, en un solo lugar" },
      { name: "description", content: "Nüva One reúne gestión, inventario, ventas, finanzas e inteligencia artificial para que las PYMEs entiendan su negocio y tomen mejores decisiones. 15 días gratis, sin tarjeta." },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_CL" },
      { property: "og:title", content: "Nüva One — La inteligencia de tu negocio, en un solo lugar" },
      { property: "og:description", content: "Gestiona, entiende y anticipa tu negocio desde una sola plataforma." },
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
          <a href="#demo">Demo</a>
          <Link to="/foro" className="transition-colors hover:text-white">Foro</Link>
          <Link to="/negocios" className="transition-colors hover:text-white">Conecta con más Pymes/Negocios</Link>
          <Link to="/noticias" className="transition-colors hover:text-white">Noticias para Negocios</Link>
          <Link to="/pricing">Precios</Link>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/auth" search={{ mode: "signup" }} className="rounded-full bg-[#E6C687] px-4 py-2 text-xs font-bold text-[#080809]">Empezar gratis</Link>
          <button type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 md:hidden">
            <span className="sr-only">{menuOpen ? "Cerrar menú" : "Abrir menú"}</span>
            <span className="text-lg">{menuOpen ? "×" : "☰"}</span>
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="border-t border-white/10 bg-[#080809]/95 px-5 py-4 backdrop-blur-xl md:hidden" aria-label="Menú móvil">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm">
            <a href="#demo" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Demo</a>
            <Link to="/foro" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Foro</Link>
            <Link to="/negocios" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Conecta con más Pymes/Negocios</Link>
            <Link to="/noticias" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Noticias para Negocios</Link>
            <Link to="/pricing" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">Precios</Link>
            <a href="#faq" onClick={closeMenu} className="rounded-xl px-3 py-3 text-white/75">FAQ</a>
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
          <p>Nüva One está pensado para acompañar la operación real de una PYME, sin convertirla en una experiencia compleja.</p>
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
        <h2>Tu negocio.<br /><em>Todo conectado.</em></h2>
        <p>Empieza con 15 días gratis y descubre cómo cambia la forma en que gestionas y entiendes tu negocio.</p>
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
    <div className="min-h-screen bg-background text-foreground">
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