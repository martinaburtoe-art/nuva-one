export type EditorialChapter={id:string;label:string;kicker:string;title:string;text:string;visual:string;metric:string};
export type EditorialChapterState={activeChapter:number;outgoingChapter:number;incomingChapter:number;localProgress:number;transitionProgress:number};
export const EDITORIAL_CHAPTERS:readonly EditorialChapter[]=[
{id:"hero",label:"Inicio",kicker:"EL NEGOCIO REAL",title:"Todo empieza aquí.",text:"Una sola mirada para entender lo que ocurre detrás de cada decisión.",visual:"hero",metric:"01"},
{id:"sales",label:"Ventas",kicker:"VENTAS",title:"Cada oportunidad cuenta.",text:"Registra ventas y convierte cada interacción en contexto para el resto del negocio.",visual:"sales",metric:"$48.990"},
{id:"customers",label:"Clientes",kicker:"CLIENTES",title:"Conoce a quien vuelve.",text:"Historial, compras y relación en un mismo lugar para entender por qué un cliente regresa.",visual:"customers",metric:"72%"},
{id:"inventory",label:"Inventario",kicker:"INVENTARIO",title:"Lo que tienes. Lo que falta. Lo que sigue.",text:"Visualiza stock y movimientos sin perderte entre planillas ni búsquedas interminables.",visual:"inventory",metric:"248 SKU"},
{id:"scanner",label:"Scanner",kicker:"SCANNER",title:"Un código. Toda la información.",text:"Escanea, identifica y actualiza el contexto del producto en segundos.",visual:"scanner",metric:"SKU 8472"},
{id:"purchases",label:"Compras",kicker:"COMPRAS",title:"Anticípate.",text:"Convierte las señales del inventario en decisiones de compra antes de quedarte sin stock.",visual:"purchases",metric:"REPOSICIÓN"},
{id:"cash",label:"Caja",kicker:"CAJA",title:"Cada peso cuenta.",text:"Una venta no termina en la caja: actualiza el contexto que necesita todo tu negocio.",visual:"cash",metric:"+$48.990"},
{id:"shipping",label:"Despachos",kicker:"DESPACHOS",title:"Del negocio a la puerta.",text:"Sigue el pedido desde el estante hasta el cliente, sin perder el hilo.",visual:"shipping",metric:"EN CAMINO"},
{id:"finance",label:"Finanzas",kicker:"FINANZAS",title:"Entiende lo que realmente está pasando.",text:"Menos ruido. Más lectura: ingresos, gastos, margen y señales que importan.",visual:"finance",metric:"+3,2%"},
{id:"score",label:"Nüva Score",kicker:"NÜVA SCORE",title:"No solo muestra datos. Los entiende.",text:"Una lectura ejecutiva para saber cómo está tu negocio y dónde conviene mirar.",visual:"score",metric:"86"},
{id:"automation",label:"Automatizaciones",kicker:"AUTOMATIZACIONES",title:"Tu negocio empieza a trabajar contigo.",text:"Detecta, alerta, recomienda y actúa sobre tareas que antes dependían de ti.",visual:"automation",metric:"24/7"},
{id:"studio",label:"Nüva Studio",kicker:"NÜVA STUDIO · IA",title:"Pregúntale a tu negocio.",text:"Una conversación con el contexto real de tu empresa para decidir qué hacer después.",visual:"studio",metric:"IA"},
{id:"connections",label:"Conexiones",kicker:"CONEXIONES",title:"Todo conectado.",text:"Ventas, clientes, inventario, caja, finanzas e inteligencia dejan de vivir por separado.",visual:"connections",metric:"∞"},
{id:"final",label:"Nüva One",kicker:"NÜVA ONE",title:"Tu negocio. Todo conectado.",text:"Empieza con una operación más clara y construye sobre ella a medida que creces.",visual:"final",metric:"14 / 14"},
];
export function clamp(value:number){return Math.min(1,Math.max(0,value))}
export function smoothstep(value:number){const t=clamp(value);return t*t*(3-2*t)}
/** Returns opacity for the two visual layers while preserving reverse-scroll continuity. */
export function getLayerOpacity(transition:number,backward:boolean,layer:0|1){const t=clamp(transition);if(backward)return layer===0?t:1-t;return layer===0?1-t:t}
/** Scroll is the single source of truth for chapter transitions. */
export function getChapterState(progress:number,reducedMotion=false):EditorialChapterState{
 const safe=clamp(progress);const count=EDITORIAL_CHAPTERS.length;const position=safe*count;
 const activeChapter=Math.min(count-1,Math.floor(position));
 const localProgress=activeChapter===count-1?1:position-activeChapter;
 const transitionWindow=activeChapter===0?0:0.24;
 const transitionProgress=reducedMotion||transitionWindow===0?0:smoothstep(clamp(localProgress/transitionWindow));
 return{activeChapter,outgoingChapter:activeChapter===0?0:activeChapter-1,incomingChapter:activeChapter,localProgress,transitionProgress};
}
