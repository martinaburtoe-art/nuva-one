import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicAiChatWidget } from "@/components/public-ai-chat-widget";
import { HomeCinematicExperience } from "@/components/home-cinematic-experience";
import { Sparkles } from "lucide-react";

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
  return (
    <header className="cinematic-site-nav">
      <div className="cinematic-site-nav__inner">
        <Link to="/" className="cinematic-site-nav__brand">Nüva One</Link>
        <nav aria-label="Navegación principal">
          <a href="#cinematic-sales">Ventas</a>
          <a href="#cinematic-inventory">Inventario</a>
          <a href="#cinematic-score">Inteligencia</a>
          <a href="#cinematic-studio">IA</a>
          <Link to="/pricing">Precios</Link>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="cinematic-site-nav__actions">
          <Link to="/demo" className="cinematic-site-nav__demo"><Sparkles size={13} /> Demo</Link>
          <Link to="/auth" search={{ mode: "signup" }} className="cinematic-site-nav__cta">Empezar gratis</Link>
        </div>
      </div>
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
        <HomeCinematicExperience />
        <FAQ />
        <FinalCta />
      </main>
      <Footer />
      <PublicAiChatWidget />
    </div>
  );
}
