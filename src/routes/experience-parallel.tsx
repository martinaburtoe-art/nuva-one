import { createFileRoute } from "@tanstack/react-router";
import { EditorialHomeExperienceV2 } from "@/components/editorial-home-experience-v2";
import "@/editorial-home-experience-final.css";

export const Route=createFileRoute("/experience-parallel")({
 head:()=>({meta:[
  {title:"Nüva One — Experiencia Paralela"},
  {name:"description",content:"Experiencia editorial paralela de Nüva One, sin video y con el mismo sistema de narrativa, navegación y módulos."},
  {name:"robots",content:"noindex,nofollow"},
  {property:"og:title",content:"Nüva One — Experiencia Paralela"},
  {property:"og:description",content:"Tu negocio. Todo conectado. Una experiencia editorial sin video."},
 ]}),
 component:()=> <EditorialHomeExperienceV2 mediaMode="css"/>,
});
