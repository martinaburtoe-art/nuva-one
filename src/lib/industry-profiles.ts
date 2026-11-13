/**
 * Chilean industry profile catalogue.
 *
 * Profiles describe operational behaviour, not SII tax codes. Keep `coreIndustry`
 * aligned with the existing public.business_industry enum. Do not mark a
 * capability as live merely because it is listed in a profile.
 */
export type CoreIndustry =
  | "retail"
  | "food"
  | "services"
  | "manufacturing"
  | "health"
  | "construction"
  | "other";

export type IndustryProfileId =
  | "hardware_store"
  | "neighborhood_grocery"
  | "beverage_store"
  | "produce_market"
  | "butcher_fishmonger"
  | "apparel_footwear"
  | "books_stationery_electronics"
  | "wholesale_distribution"
  | "restaurant_cafe"
  | "bakery_pastry"
  | "manufacturing_workshop"
  | "auto_repair_parts"
  | "agriculture_agroinputs"
  | "transport_logistics"
  | "construction_contractor"
  | "professional_services"
  | "beauty_wellness"
  | "veterinary_pet"
  | "lodging_tourism"
  | "equipment_rental"
  | "education_fitness"
  | "field_technical_service"
  | "general_business";

export type IndustryCapability =
  | "product_variants"
  | "fractional_units"
  | "unit_conversions"
  | "barcode"
  | "lots_expiry"
  | "serial_tracking"
  | "multi_warehouse"
  | "price_lists"
  | "volume_pricing"
  | "quotes"
  | "dispatch"
  | "recipes_bom"
  | "production_orders"
  | "appointments"
  | "work_orders"
  | "projects"
  | "fleet"
  | "asset_rental"
  | "reservations"
  | "customer_history"
  | "commissions"
  | "returns_warranty"
  | "cash_register"
  | "credit_accounts";

export type IndustryProfile = {
  id: IndustryProfileId;
  label: string;
  pluralLabel: string;
  coreIndustry: CoreIndustry;
  group: "commerce" | "food" | "production" | "services" | "logistics";
  summary: string;
  examples: string[];
  capabilities: IndustryCapability[];
  suggestedUnits: string[];
  operationalQuestions: string[];
  primaryKpis: string[];
  activation: "priority_0" | "priority_1" | "priority_2" | "priority_3" | "general";
  regulatoryNote?: string;
};

export const INDUSTRY_PROFILES: readonly IndustryProfile[] = [
  {
    id: "hardware_store",
    label: "Ferretería y materiales",
    pluralLabel: "Ferreterías, barracas y materiales de construcción",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Productos técnicos con medidas, materiales, formatos y unidades de venta diferentes.",
    examples: ["Ferretería", "Barraca", "Pernos y fijaciones", "Electricidad", "Sanitarios", "Pinturas"],
    capabilities: ["product_variants", "fractional_units", "unit_conversions", "barcode", "multi_warehouse", "price_lists", "volume_pricing", "quotes", "dispatch", "cash_register", "credit_accounts"],
    suggestedUnits: ["un", "m", "m²", "m³", "kg", "saco", "caja", "rollo", "barra", "pallet"],
    operationalQuestions: ["¿Vendes productos por metro, kilo o dimensiones?", "¿Necesitas cotizar materiales por obra?", "¿Manejas precios especiales para maestros o constructoras?", "¿Realizas cortes o despachos?"],
    primaryKpis: ["Margen por SKU y familia", "Rotación y stock inmovilizado", "Quiebres de stock", "Cotizaciones ganadas", "Margen por cliente/obra"],
    activation: "priority_0",
  },
  {
    id: "neighborhood_grocery",
    label: "Almacén y minimarket",
    pluralLabel: "Almacenes, minimarkets y supermercados",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Venta rápida de productos de alta rotación, reposición frecuente y control de caja.",
    examples: ["Almacén de barrio", "Minimarket", "Autoservicio", "Supermercado"],
    capabilities: ["barcode", "lots_expiry", "unit_conversions", "multi_warehouse", "volume_pricing", "cash_register", "returns_warranty"],
    suggestedUnits: ["un", "pack", "display", "caja", "kg", "lt"],
    operationalQuestions: ["¿Vendes productos refrigerados o con vencimiento?", "¿Compras por caja y vendes por unidad?", "¿Cuántas cajas o sucursales tienes?", "¿Necesitas registrar mermas y vencimientos?"],
    primaryKpis: ["Venta diaria y por franja", "Ticket promedio", "Margen por categoría", "Merma y vencimientos", "Quiebres y reposición"],
    activation: "priority_0",
  },
  {
    id: "beverage_store",
    label: "Botillería y bebidas",
    pluralLabel: "Botillerías y tiendas de bebidas",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Formatos, packs, envases retornables y promociones por volumen.",
    examples: ["Botillería", "Distribuidora de bebidas", "Tienda de bebidas"],
    capabilities: ["barcode", "lots_expiry", "unit_conversions", "volume_pricing", "cash_register", "credit_accounts"],
    suggestedUnits: ["un", "pack", "caja", "bandeja", "retornable"],
    operationalQuestions: ["¿Manejas envases retornables?", "¿Vendes por unidad, pack y caja?", "¿Necesitas controlar compras por volumen?"],
    primaryKpis: ["Margen por formato", "Rotación", "Retornables pendientes", "Venta por franja"],
    activation: "priority_1",
    regulatoryNote: "Las funciones comerciales deben respetar las restricciones legales aplicables a la venta de alcohol.",
  },
  {
    id: "produce_market",
    label: "Frutas y verduras",
    pluralLabel: "Verdulerías, fruterías y productos frescos",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Compra en formatos mayoristas y venta por peso o unidad, con mermas y costos variables.",
    examples: ["Verdulería", "Frutería", "Distribuidor de frutas y verduras"],
    capabilities: ["fractional_units", "unit_conversions", "lots_expiry", "multi_warehouse", "cash_register"],
    suggestedUnits: ["kg", "g", "caja", "saco", "un", "bandeja"],
    operationalQuestions: ["¿Compras por caja o saco y vendes por kilo?", "¿Necesitas registrar merma por producto?", "¿Clasificas por calibre o calidad?"],
    primaryKpis: ["Margen real por kilo", "Merma porcentual", "Rendimiento vendible", "Costo promedio de compra"],
    activation: "priority_2",
  },
  {
    id: "butcher_fishmonger",
    label: "Carnicería y pescadería",
    pluralLabel: "Carnicerías, pescaderías y fiambrerías",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Productos de peso variable, cortes, lotes y control de frescura.",
    examples: ["Carnicería", "Pescadería", "Fiambrería", "Pollería"],
    capabilities: ["fractional_units", "unit_conversions", "lots_expiry", "barcode", "cash_register"],
    suggestedUnits: ["kg", "g", "un", "bandeja", "caja"],
    operationalQuestions: ["¿Vendes por peso variable?", "¿Necesitas registrar lotes y fechas?", "¿Desglosas materia prima en cortes o preparaciones?"],
    primaryKpis: ["Rendimiento por corte", "Merma", "Margen por kilo", "Rotación y vencimientos"],
    activation: "priority_2",
    regulatoryNote: "La trazabilidad y cadena de frío deben configurarse según la normativa sanitaria aplicable; el software no certifica cumplimiento.",
  },
  {
    id: "apparel_footwear",
    label: "Ropa y calzado",
    pluralLabel: "Tiendas de ropa, calzado y accesorios",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Catálogo con variantes combinables de talla, color, modelo y temporada.",
    examples: ["Boutique", "Zapatería", "Tienda deportiva", "Accesorios"],
    capabilities: ["product_variants", "barcode", "multi_warehouse", "price_lists", "returns_warranty", "cash_register"],
    suggestedUnits: ["un", "par", "pack"],
    operationalQuestions: ["¿Manejas tallas y colores por modelo?", "¿Tienes colecciones o temporadas?", "¿Necesitas transferir stock entre locales?"],
    primaryKpis: ["Rotación por talla/color", "Sell-through", "Quiebres de curva", "Margen por colección"],
    activation: "priority_1",
  },
  {
    id: "books_stationery_electronics",
    label: "Librería, papelería y electrónica",
    pluralLabel: "Librerías, papelerías, regalos y electrónica",
    coreIndustry: "retail",
    group: "commerce",
    summary: "Catálogos con identificadores editoriales, modelos, atributos técnicos y garantías.",
    examples: ["Librería", "Papelería", "Tienda de computación", "Electrónica"],
    capabilities: ["product_variants", "barcode", "serial_tracking", "returns_warranty", "cash_register"],
    suggestedUnits: ["un", "pack", "caja"],
    operationalQuestions: ["¿Controlas números de serie o IMEI?", "¿Necesitas gestionar garantías y devoluciones?", "¿Vendes kits o accesorios compatibles?"],
    primaryKpis: ["Margen por modelo", "Obsolescencia", "Garantías abiertas", "Venta cruzada"],
    activation: "priority_1",
  },
  {
    id: "wholesale_distribution",
    label: "Distribuidora y mayorista",
    pluralLabel: "Distribuidoras, mayoristas y bodegas",
    coreIndustry: "retail",
    group: "logistics",
    summary: "Ventas por volumen, listas de precios, bodegas, picking y despacho.",
    examples: ["Distribuidora", "Mayorista", "Importadora", "Bodega comercial"],
    capabilities: ["product_variants", "unit_conversions", "multi_warehouse", "price_lists", "volume_pricing", "quotes", "dispatch", "credit_accounts", "lots_expiry"],
    suggestedUnits: ["un", "pack", "caja", "pallet", "kg", "lt"],
    operationalQuestions: ["¿Tienes más de una bodega?", "¿Usas listas de precios por cliente?", "¿Preparas pedidos y rutas de despacho?", "¿Vendes con crédito?"],
    primaryKpis: ["Fill rate", "Margen neto por despacho", "Rotación", "DSO", "Rentabilidad por cliente/ruta"],
    activation: "priority_0",
  },
  {
    id: "restaurant_cafe",
    label: "Restaurante y cafetería",
    pluralLabel: "Restaurantes, cafeterías y fuentes de soda",
    coreIndustry: "food",
    group: "food",
    summary: "Menús, recetas, ingredientes, mesas, comandas y pedidos.",
    examples: ["Restaurante", "Cafetería", "Fuente de soda", "Food truck"],
    capabilities: ["recipes_bom", "lots_expiry", "fractional_units", "appointments", "cash_register", "customer_history"],
    suggestedUnits: ["un", "kg", "g", "lt", "ml", "porción"],
    operationalQuestions: ["¿Preparas recetas con ingredientes descontados de stock?", "¿Trabajas con mesas, retiro o delivery?", "¿Necesitas reservas y comandas?"],
    primaryKpis: ["Food cost", "Margen por plato", "Merma", "Ticket promedio", "Tiempo de preparación"],
    activation: "priority_1",
  },
  {
    id: "bakery_pastry",
    label: "Panadería y pastelería",
    pluralLabel: "Panaderías, pastelerías y producción a pedido",
    coreIndustry: "food",
    group: "production",
    summary: "Fórmulas, lotes de producción, rendimiento, mermas y pedidos programados.",
    examples: ["Panadería", "Pastelería", "Tortas a pedido", "Repostería"],
    capabilities: ["recipes_bom", "production_orders", "lots_expiry", "fractional_units", "cash_register"],
    suggestedUnits: ["kg", "g", "lt", "ml", "un", "bandeja", "caja"],
    operationalQuestions: ["¿Produces por lotes o contra pedido?", "¿Necesitas fórmulas y rendimientos?", "¿Vendes por peso, unidad o encargo?"],
    primaryKpis: ["Costo por lote", "Rendimiento", "Merma", "Pedidos a tiempo"],
    activation: "priority_2",
  },
  {
    id: "manufacturing_workshop",
    label: "Manufactura y producción",
    pluralLabel: "Manufactura y talleres productivos",
    coreIndustry: "manufacturing",
    group: "production",
    summary: "Materias primas, listas de materiales, órdenes de producción y costos.",
    examples: ["Fábrica", "Taller productivo", "Confección", "Muebles", "Metalúrgica"],
    capabilities: ["product_variants", "unit_conversions", "multi_warehouse", "recipes_bom", "production_orders", "lots_expiry", "serial_tracking", "quotes"],
    suggestedUnits: ["un", "kg", "g", "m", "m²", "m³", "lt", "plancha"],
    operationalQuestions: ["¿Fabricas contra stock o contra pedido?", "¿Usas listas de materiales?", "¿Necesitas controlar etapas y mermas?"],
    primaryKpis: ["Costo real vs estándar", "Rendimiento", "Merma de producción", "Cumplimiento de órdenes"],
    activation: "priority_2",
  },
  {
    id: "auto_repair_parts",
    label: "Taller mecánico y repuestos",
    pluralLabel: "Talleres mecánicos y repuesteras",
    coreIndustry: "services",
    group: "services",
    summary: "Órdenes de trabajo, vehículos, repuestos, mano de obra y garantías.",
    examples: ["Taller mecánico", "Repuestera", "Electricidad automotriz", "Vulcanización"],
    capabilities: ["work_orders", "product_variants", "serial_tracking", "quotes", "appointments", "customer_history", "returns_warranty"],
    suggestedUnits: ["un", "lt", "kg", "juego", "hora"],
    operationalQuestions: ["¿Necesitas registrar patente, VIN y kilometraje?", "¿Cotizas repuestos y mano de obra juntos?", "¿Gestionas agenda y órdenes de trabajo?"],
    primaryKpis: ["Margen por OT", "Horas facturadas", "Retrabajos", "Rotación de repuestos"],
    activation: "priority_1",
  },
  {
    id: "agriculture_agroinputs",
    label: "Agricultura y agroinsumos",
    pluralLabel: "Agricultura, viveros y agroinsumos",
    coreIndustry: "other",
    group: "production",
    summary: "Predios, temporadas, cultivos, insumos, labores, cosechas y rendimientos.",
    examples: ["Agricultor", "Vivero", "Agroinsumos", "Productor frutícola"],
    capabilities: ["lots_expiry", "fractional_units", "unit_conversions", "multi_warehouse", "production_orders"],
    suggestedUnits: ["ha", "kg", "g", "lt", "ml", "saco", "bandeja", "planta"],
    operationalQuestions: ["¿Gestionas varios predios o cuarteles?", "¿Necesitas asociar costos a cultivo y temporada?", "¿Registras cosecha y rendimiento?"],
    primaryKpis: ["Costo por hectárea", "Rendimiento por cultivo", "Consumo de insumos", "Margen por temporada"],
    activation: "priority_2",
  },
  {
    id: "transport_logistics",
    label: "Transporte y logística",
    pluralLabel: "Transporte, flotas y servicios logísticos",
    coreIndustry: "services",
    group: "logistics",
    summary: "Vehículos, conductores, viajes, rutas, combustible y mantenimiento.",
    examples: ["Transporte de carga", "Última milla", "Mudanzas", "Logística"],
    capabilities: ["fleet", "dispatch", "work_orders", "projects", "serial_tracking"],
    suggestedUnits: ["km", "hora", "viaje", "ton", "m³", "lt"],
    operationalQuestions: ["¿Administras flota propia o de terceros?", "¿Necesitas costear viajes y combustible?", "¿Controlas mantenimiento y conductores?"],
    primaryKpis: ["Costo por km", "Utilización de flota", "Entrega a tiempo", "Margen por viaje"],
    activation: "priority_2",
  },
  {
    id: "construction_contractor",
    label: "Construcción y contratistas",
    pluralLabel: "Constructoras, contratistas y obras",
    coreIndustry: "construction",
    group: "services",
    summary: "Obras, presupuestos, partidas, materiales, subcontratos y avance.",
    examples: ["Constructora", "Contratista", "Instalaciones", "Terminaciones"],
    capabilities: ["projects", "quotes", "multi_warehouse", "unit_conversions", "work_orders", "credit_accounts"],
    suggestedUnits: ["un", "m", "m²", "m³", "kg", "jornal", "hora", "saco"],
    operationalQuestions: ["¿Controlas varias obras?", "¿Necesitas presupuestos por partidas?", "¿Imputas materiales y horas a cada obra?"],
    primaryKpis: ["Margen por obra", "Desviación presupuestaria", "Avance físico/financiero", "Caja proyectada"],
    activation: "priority_1",
  },
  {
    id: "professional_services",
    label: "Servicios profesionales",
    pluralLabel: "Consultoras, agencias y profesionales B2B",
    coreIndustry: "services",
    group: "services",
    summary: "Clientes, propuestas, contratos, proyectos, horas y entregables.",
    examples: ["Consultora", "Agencia", "Estudio profesional", "Servicios B2B"],
    capabilities: ["projects", "quotes", "appointments", "customer_history", "credit_accounts"],
    suggestedUnits: ["hora", "día", "proyecto", "hito", "mensualidad"],
    operationalQuestions: ["¿Cobras por hora, proyecto o mensualidad?", "¿Necesitas controlar hitos y entregables?", "¿Asignas costos y horas por cliente?"],
    primaryKpis: ["Margen por proyecto", "Pipeline", "Horas facturables", "Renovaciones", "DSO"],
    activation: "priority_1",
  },
  {
    id: "beauty_wellness",
    label: "Belleza y bienestar",
    pluralLabel: "Peluquerías, barberías, estética y bienestar",
    coreIndustry: "services",
    group: "services",
    summary: "Agenda, profesionales, cabinas, servicios, comisiones e insumos.",
    examples: ["Peluquería", "Barbería", "Centro de estética", "Spa"],
    capabilities: ["appointments", "commissions", "customer_history", "lots_expiry", "cash_register"],
    suggestedUnits: ["servicio", "sesión", "hora", "un", "ml"],
    operationalQuestions: ["¿Trabajas con agenda y reservas?", "¿Pagas comisiones por profesional?", "¿Necesitas controlar insumos por servicio?"],
    primaryKpis: ["Ocupación", "Ingreso por hora", "Recurrencia", "Ticket promedio", "Comisiones"],
    activation: "priority_1",
  },
  {
    id: "veterinary_pet",
    label: "Veterinaria y mascotas",
    pluralLabel: "Clínicas veterinarias y tiendas de mascotas",
    coreIndustry: "health",
    group: "services",
    summary: "Tutores, mascotas, atenciones, recordatorios y productos especializados.",
    examples: ["Clínica veterinaria", "Pet shop", "Peluquería canina"],
    capabilities: ["appointments", "customer_history", "lots_expiry", "barcode", "cash_register"],
    suggestedUnits: ["un", "kg", "saco", "consulta", "sesión"],
    operationalQuestions: ["¿Gestionas fichas por mascota y tutor?", "¿Necesitas agenda y recordatorios?", "¿Vendes alimentos por formato o peso?"],
    primaryKpis: ["Atenciones", "Recurrencia", "Ventas por categoría", "Vencimientos"],
    activation: "priority_2",
    regulatoryNote: "Separar la información clínica y restringir su acceso; validar obligaciones profesionales y sanitarias antes de activar funciones clínicas.",
  },
  {
    id: "lodging_tourism",
    label: "Hotelería y turismo",
    pluralLabel: "Hoteles, hostales, cabañas y turismo",
    coreIndustry: "services",
    group: "services",
    summary: "Habitaciones, reservas, temporadas, huéspedes y servicios adicionales.",
    examples: ["Hotel", "Hostal", "Cabañas", "Operador turístico"],
    capabilities: ["reservations", "appointments", "customer_history", "cash_register"],
    suggestedUnits: ["noche", "habitación", "persona", "servicio", "tour"],
    operationalQuestions: ["¿Gestionas habitaciones o cupos?", "¿Tienes temporadas y tarifas distintas?", "¿Vendes por canales externos?"],
    primaryKpis: ["Ocupación", "ADR", "RevPAR", "Cancelaciones", "Ingreso adicional"],
    activation: "priority_2",
  },
  {
    id: "equipment_rental",
    label: "Arriendo de equipos",
    pluralLabel: "Arriendo de maquinaria, equipos y herramientas",
    coreIndustry: "services",
    group: "services",
    summary: "Activos, disponibilidad, contratos, depósitos, entregas y mantención.",
    examples: ["Arriendo de maquinaria", "Herramientas", "Equipos audiovisuales"],
    capabilities: ["asset_rental", "serial_tracking", "appointments", "work_orders", "quotes", "customer_history"],
    suggestedUnits: ["hora", "día", "semana", "mes", "un"],
    operationalQuestions: ["¿Necesitas calendario de disponibilidad?", "¿Cobras por hora, día o semana?", "¿Registras entrega, devolución y daños?"],
    primaryKpis: ["Utilización de activos", "Ingreso por activo", "Tiempo fuera de servicio", "Mantenciones"],
    activation: "priority_2",
  },
  {
    id: "education_fitness",
    label: "Educación y fitness",
    pluralLabel: "Academias, centros educativos y gimnasios",
    coreIndustry: "services",
    group: "services",
    summary: "Alumnos o socios, planes, clases, cupos, asistencia y cuotas.",
    examples: ["Academia", "Gimnasio", "Escuela de oficios", "Centro de capacitación"],
    capabilities: ["appointments", "reservations", "customer_history", "credit_accounts"],
    suggestedUnits: ["clase", "sesión", "mes", "plan", "matrícula"],
    operationalQuestions: ["¿Trabajas con planes o matrículas?", "¿Necesitas controlar cupos y asistencia?", "¿Cobras mensualidades recurrentes?"],
    primaryKpis: ["Retención", "Ocupación", "Morosidad", "Ingreso recurrente"],
    activation: "priority_2",
  },
  {
    id: "field_technical_service",
    label: "Servicio técnico y mantención",
    pluralLabel: "Servicios técnicos, instalación y mantención",
    coreIndustry: "services",
    group: "services",
    summary: "Tickets, órdenes de trabajo, técnicos, visitas, repuestos y SLA.",
    examples: ["Servicio técnico", "Instalaciones", "Climatización", "Mantención industrial"],
    capabilities: ["work_orders", "appointments", "dispatch", "serial_tracking", "quotes", "customer_history"],
    suggestedUnits: ["hora", "visita", "un", "km", "servicio"],
    operationalQuestions: ["¿Atiendes en terreno?", "¿Necesitas asignar técnicos y rutas?", "¿Controlas garantías y tiempos de respuesta?"],
    primaryKpis: ["Resolución primera visita", "Cumplimiento SLA", "Costo por OT", "Margen por servicio"],
    activation: "priority_2",
  },
  {
    id: "general_business",
    label: "Otro tipo de negocio",
    pluralLabel: "Otros negocios y modelos mixtos",
    coreIndustry: "other",
    group: "services",
    summary: "Configuración flexible cuando la actividad no encaja en un perfil predefinido.",
    examples: ["Negocio mixto", "Emprendimiento", "Actividad especializada"],
    capabilities: ["quotes", "customer_history", "cash_register"],
    suggestedUnits: ["un", "servicio", "hora"],
    operationalQuestions: ["¿Qué vendes o qué servicio prestas?", "¿Cómo compras o produces?", "¿Qué necesitas controlar cada semana?"],
    primaryKpis: ["Ventas", "Gastos", "Margen", "Clientes"],
    activation: "general",
  },
] as const;

export function getIndustryProfile(id: string | null | undefined): IndustryProfile | undefined {
  return INDUSTRY_PROFILES.find((profile) => profile.id === id);
}

export function getIndustryProfilesByCore(coreIndustry: CoreIndustry): IndustryProfile[] {
  return INDUSTRY_PROFILES.filter((profile) => profile.coreIndustry === coreIndustry);
}

export function searchIndustryProfiles(query: string): IndustryProfile[] {
  const normalized = query.trim().toLocaleLowerCase("es-CL");
  if (!normalized) return [...INDUSTRY_PROFILES];
  return INDUSTRY_PROFILES.filter((profile) =>
    [profile.label, profile.pluralLabel, profile.summary, ...profile.examples]
      .some((value) => value.toLocaleLowerCase("es-CL").includes(normalized)),
  );
}
