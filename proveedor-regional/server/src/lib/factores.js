// Factores de emisión y parámetros de la metodología KONTAX Events (factores Chile 2026).
// Fuente: documentación KONTAX Events, Parte 2 (CalculadoraHuellaEventos.FACTORES_EMISION).
// Revisa y valida estos valores antes de emitir informes oficiales.

export const FACTORES = {
  // Energía
  electricidad_red: 0.40, // kgCO2e/kWh, mix Chile
  electricidad_renovable: 0.05, // kgCO2e/kWh
  diesel: 2.68, // kgCO2e/litro
  gasolina: 2.31, // kgCO2e/litro
  gas_natural: 2.03, // kgCO2e/m³
  glp: 3.0, // kgCO2e/kg

  // Transporte de asistentes
  // Auto: 0,192 kgCO2e por pasajero-km supone 2,5 pasajeros → 0,48 por vehículo-km.
  auto_vehiculo_km: 0.192 * 2.5,
  bus_pasajero_km: 0.089,
  avion_domestico: 0.255, // < 1.500 km
  avion_regional: 0.195, // 1.500 – 3.500 km
  avion_internacional: 0.15, // > 3.500 km

  // Residuos (kgCO2e/kg)
  residuo_vertedero: 0.517,
  residuo_incineracion: 0.21,
  residuo_compostaje: 0.05,
  residuo_reciclaje_proceso: 0.02, // procesamiento de reciclables
  // Emisiones evitadas por reciclar (se informan aparte; no se restan del total).
  evitada_plastico: 1.2,
  evitada_papel: 0.7,
  evitada_vidrio: 0.314,
  evitada_aluminio: 9.0,

  // Alimentos (kgCO2e/kg)
  carne_vacuno: 27.0,
  carne_cerdo: 12.1,
  carne_pollo: 6.9,
  pescado: 5.5,
  lacteos_queso: 13.5,
  lacteos_leche: 1.9,
  huevos: 4.8,
  legumbres: 0.9,
  cereales: 2.7,
  frutas_verduras: 2.0,
  envase_desechable: 0.015 * 6, // kgCO2e por unidad (15 g × 6 kgCO2e/kg)

  // Agua
  agua_red: 0.344, // kgCO2e/m³
  agua_embotellada: 0.244, // kgCO2e/litro

  // Estimaciones cuando no hay datos medidos (tCO2e por 1.000 asistentes)
  infraestructura_estimada_t_por_mil: 0.75,
  otros_estimado_t_por_mil: 0.2,

  // Alojamiento: sin factor validado en la metodología. Si se define (kgCO2e por noche),
  // se suma a la categoría "otros". Mientras sea null, las noches solo se informan.
  alojamiento_noche: null,
};

// Ciudades de origen con distancia aproximada por tramo hasta la ciudad del evento (Antofagasta).
// Son estimaciones redondeadas: ajústalas si el evento se realiza en otra ciudad.
export const ORIGENES = [
  { id: 'antofagasta', nombre: 'Antofagasta', km: 10 },
  { id: 'mejillones', nombre: 'Mejillones', km: 65 },
  { id: 'sierra_gorda', nombre: 'Sierra Gorda', km: 140 },
  { id: 'tocopilla', nombre: 'Tocopilla', km: 190 },
  { id: 'calama', nombre: 'Calama', km: 215 },
  { id: 'maria_elena', nombre: 'María Elena', km: 220 },
  { id: 'taltal', nombre: 'Taltal', km: 300 },
  { id: 'san_pedro', nombre: 'San Pedro de Atacama', km: 315 },
  { id: 'ollague', nombre: 'Ollagüe', km: 420 },
  { id: 'iquique', nombre: 'Iquique', km: 410 },
  { id: 'copiapo', nombre: 'Copiapó', km: 560 },
  { id: 'arica', nombre: 'Arica', km: 700 },
  { id: 'la_serena', nombre: 'La Serena / Coquimbo', km: 890 },
  { id: 'santiago', nombre: 'Santiago', km: 1100 },
  { id: 'valparaiso', nombre: 'Valparaíso / Viña del Mar', km: 1150 },
  { id: 'centro_sur', nombre: 'Otra ciudad del centro o sur de Chile', km: 1500 },
  { id: 'sudamerica', nombre: 'Otro país de Sudamérica', km: 2500 },
  { id: 'america_norte', nombre: 'Norteamérica o Centroamérica', km: 7500 },
  { id: 'europa', nombre: 'Europa', km: 11000 },
  { id: 'otro_continente', nombre: 'Asia, Oceanía u otro continente', km: 15000 },
];

export const MODOS = [
  { id: 'auto', nombre: 'Auto particular' },
  { id: 'bus', nombre: 'Bus o transporte público' },
  { id: 'taxi', nombre: 'Taxi o aplicación' },
  { id: 'avion', nombre: 'Avión' },
  { id: 'activo', nombre: 'A pie o bicicleta' },
];

export const PERFILES = [
  'Asistente',
  'Expositor',
  'Delegación internacional',
  'Pyme proveedora',
  'Prensa',
  'Organización',
];

// Subtipos permitidos por categoría en la captura de datos operativos.
export const SUBTIPOS = {
  energia: {
    electricidad_red: { nombre: 'Electricidad de la red', unidad: 'kWh' },
    electricidad_renovable: { nombre: 'Electricidad renovable certificada', unidad: 'kWh' },
    diesel: { nombre: 'Diésel (generadores)', unidad: 'L' },
    gasolina: { nombre: 'Gasolina', unidad: 'L' },
    gas_natural: { nombre: 'Gas natural', unidad: 'm³' },
    glp: { nombre: 'Gas licuado (GLP)', unidad: 'kg' },
  },
  residuos: {
    reciclaje: { nombre: 'Enviado a reciclaje', unidad: 'kg' },
    compostaje: { nombre: 'Enviado a compostaje', unidad: 'kg' },
    vertedero: { nombre: 'Enviado a relleno sanitario', unidad: 'kg' },
    incineracion: { nombre: 'Incineración con recuperación', unidad: 'kg' },
  },
  catering: {
    carne_vacuno: { nombre: 'Carne de vacuno', unidad: 'kg' },
    carne_cerdo: { nombre: 'Carne de cerdo', unidad: 'kg' },
    carne_pollo: { nombre: 'Pollo', unidad: 'kg' },
    pescado: { nombre: 'Pescados y mariscos', unidad: 'kg' },
    lacteos_queso: { nombre: 'Quesos', unidad: 'kg' },
    lacteos_leche: { nombre: 'Leche y lácteos', unidad: 'kg' },
    huevos: { nombre: 'Huevos', unidad: 'kg' },
    legumbres: { nombre: 'Legumbres', unidad: 'kg' },
    cereales: { nombre: 'Cereales, pan y masas', unidad: 'kg' },
    frutas_verduras: { nombre: 'Frutas y verduras', unidad: 'kg' },
    envase_desechable: { nombre: 'Envases desechables', unidad: 'unidades' },
  },
  agua: {
    agua_red: { nombre: 'Agua de red', unidad: 'm³' },
    agua_embotellada: { nombre: 'Agua embotellada', unidad: 'L' },
  },
  infraestructura: {
    medido: { nombre: 'Emisiones medidas de montaje y logística', unidad: 'kgCO2e' },
  },
  otros: {
    medido: { nombre: 'Merchandising, impresos y otros (medido)', unidad: 'kgCO2e' },
  },
};

// Materiales de residuos, para calcular emisiones evitadas por reciclaje.
export const MATERIALES_RESIDUO = {
  organico: 'Orgánico',
  plastico: 'Plástico',
  papel: 'Papel y cartón',
  vidrio: 'Vidrio',
  aluminio: 'Latas de aluminio',
  mixto: 'Mixto o no separado',
};

// Criterios de la certificación Evento Verde (KONTAX Events).
export const CRITERIOS_VERDE = {
  max_kg_por_asistente: 15,
  min_reciclaje_pct: 60,
  min_renovable_pct: 30,
};

export const CATEGORIAS = [
  { id: 'transporte', nombre: 'Transporte de asistentes' },
  { id: 'energia', nombre: 'Energía' },
  { id: 'residuos', nombre: 'Residuos' },
  { id: 'catering', nombre: 'Catering y alimentos' },
  { id: 'agua', nombre: 'Agua' },
  { id: 'infraestructura', nombre: 'Infraestructura temporal' },
  { id: 'otros', nombre: 'Otros' },
];
