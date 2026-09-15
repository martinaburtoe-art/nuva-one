import { createFileRoute } from "@tanstack/react-router";
import { EditorialHomeExperienceV2 } from "@/components/editorial-home-experience-v2";
import "@/editorial-home-experience-final.css";
export const Route=createFileRoute("/experience")({head:()=>({meta:[{title:"Nüva One — Experiencia"},{name:"description",content:"Tu negocio, visto como una sola operación: gestión, contexto e inteligencia en una experiencia editorial."},{name:"robots",content:"noindex,nofollow"},{property:"og:title",content:"Nüva One — Experiencia"},{property:"og:description",content:"Tu negocio. Todo conectado."}]}),component:EditorialHomeExperienceV2});
