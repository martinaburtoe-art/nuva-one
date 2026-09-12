import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { EditorialHomeExperience } from "@/components/editorial-home-experience";
import { installEditorialScrollTransition } from "@/editorial-home-experience-transition";
import "@/editorial-home-experience.css";
import "@/editorial-home-experience-transition.css";
import "@/editorial-home-experience-reference.css";
import "@/editorial-home-experience-story.css";

function EditorialExperienceRoute() {
  useEffect(() => {
    const cleanup = installEditorialScrollTransition();
    return cleanup;
  }, []);
  return <EditorialHomeExperience />;
}

export const Route = createFileRoute("/experience")({
  head: () => ({
    meta: [
      { title: "Nüva One — Experiencia" },
      { name: "description", content: "Una nueva forma de entender tu negocio: gestión, contexto e inteligencia en una experiencia editorial." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Nüva One — Experiencia" },
      { property: "og:description", content: "Tu negocio. Todo conectado." },
    ],
  }),
  component: EditorialExperienceRoute,
});
