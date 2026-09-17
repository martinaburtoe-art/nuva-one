import { useEffect, useRef, useState, type CSSProperties } from "react";
import { EDITORIAL_CHAPTERS } from "@/editorial-home-experience-engine";

type SceneArtProps={kind:string;progress:number;reducedMotion?:boolean;mediaMode?:"video"|"css"};

// Mientras llegan los 14 masters definitivos, el master real disponible se usa como
// fallback cinematográfico para todos los capítulos. El motor lo scrubea con el scroll.
const REAL_MEDIA:Record<string,string>=Object.fromEntries(
  EDITORIAL_CHAPTERS.map((chapter)=>[chapter.visual,"scan.mp4"]),
);

export function SceneArt({kind,progress,reducedMotion=false,mediaMode="video"}:SceneArtProps){
 const style={"--art-progress":progress} as CSSProperties;
 const index=EDITORIAL_CHAPTERS.findIndex(item=>item.visual===kind);
 const chapter=EDITORIAL_CHAPTERS[index];
 const videoRef=useRef<HTMLVideoElement|null>(null);
 const [videoFailed,setVideoFailed]=useState(false);
 const mediaFile=REAL_MEDIA[kind];
 const showVideo=mediaMode==="video"&&!reducedMotion&&!videoFailed&&Boolean(mediaFile);

 useEffect(()=>{
  const video=videoRef.current;
  if(!video||!showVideo)return;

  let frame=0;
  const syncFrame=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    if(!Number.isFinite(video.duration)||video.duration<=0)return;
    const safeProgress=Math.min(1,Math.max(0,progress));
    const target=safeProgress*Math.max(0,video.duration-0.04);
    if(Math.abs(video.currentTime-target)>0.02){
      try{video.currentTime=target}catch{}
    }
   });
  };

  const onMetadata=()=>{
    video.pause();
    syncFrame();
  };

  if(video.readyState>=1)onMetadata();
  else video.addEventListener("loadedmetadata",onMetadata,{once:true});

  return()=>{
    cancelAnimationFrame(frame);
    video.removeEventListener("loadedmetadata",onMetadata);
  };
 },[progress,showVideo]);

 return <div className={`editorial-art editorial-art--${kind}`} style={style} aria-hidden="true">
  {showVideo&&<video
    ref={videoRef}
    className="editorial-art__video"
    src={`/home-cinematic/${mediaFile}`}
    muted
    playsInline
    preload="auto"
    loop
    disablePictureInPicture
    onLoadedMetadata={()=>{
      const video=videoRef.current;
      if(video){
        video.pause();
        try{video.currentTime=Math.min(1,Math.max(0,progress))*Math.max(0,video.duration-0.04)}catch{}
      }
    }}
    onError={()=>setVideoFailed(true)}
    aria-hidden="true"
  />}
  <div className="editorial-art__image"><div className="editorial-art__grain"/><div className="editorial-art__architecture editorial-art__architecture--one"/><div className="editorial-art__architecture editorial-art__architecture--two"/><div className="editorial-art__architecture editorial-art__architecture--three"/></div><div className="editorial-art__light"/><div className="editorial-art__subject"><span/><i/></div><div className="editorial-art__surface"/><div className="editorial-art__object editorial-art__object--a"/><div className="editorial-art__object editorial-art__object--b"/><div className="editorial-art__line"/><div className="editorial-art__caption"><span>{String(index+1).padStart(2,"0")}</span><small>{chapter?.label}</small></div>
 </div>;
}
