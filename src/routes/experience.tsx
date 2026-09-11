import { createFileRoute } from "@tanstack/react-router";
import { EditorialHomeExperience } from "@/components/editorial-home-experience";
import "@/editorial-home-experience.css";

export const Route = createFileRoute("/experience")({
  head: () => ({
    meta: [
      { title: "Nüva One — Experiencia" },
      { name: "description", content: "Una nueva forma de entender tu negocio: gestión, contexto e inteligencia en una experiencia editorial." },
      { property: "og:title", content: "Nüva One — Experiencia" },
      { property: "og:description", content: "Tu negocio. Todo conectado." },
    ],
  }),
  component: EditorialHomeExperience,
});
