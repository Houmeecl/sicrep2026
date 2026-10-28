// Factores de emisión y parámetros de la metodología (KONTAX Events, factores Chile 2026).
//
// Cada factor declara su unidad y su fuente. Al cerrar un evento, los factores usados quedan
// copiados en el informe emitido, así que cambiar un valor aquí NO altera informes ya emitidos.
// Si cambias un valor, sube METODOLOGIA.version.

export const METODOLOGIA = {
  version: 'kontax-events-cl-2026.2',
  nombre: 'KONTAX Events · factores Chile 2026',
  estado: 'Factores tomados de la documentación KONTAX Events; pendientes de contraste con fuente oficial vigente.',
};

const KONTAX = 'KONTAX Events, Sistema Completo, Parte 2 (feb. 2026)';
const SUPUESTO = 'Supuesto metodológico de Proveedor Regional';

// valor, unidad y fuente de cada factor.
const DEFINICION = {
  // Energía
  electricidad_red: [0.4, 'kgCO2e/kWh', `${KONTAX}. Contrastar con el factor oficial del Sistema Eléctrico Nacional vigente.`],
  electricidad_renovable: [0.05, 'kgCO2e/kWh', KONTAX],
  diesel: [2.68, 'kgCO2e/L', KONTAX],
  gasolina: [2.31, 'kgCO2e/L', KONTAX],
  gas_natural: [2.03, 'kgCO2e/m³', KONTAX],
  glp: [3.0, 'kgCO2e/kg', KONTAX],

  // Transporte
  auto_vehiculo_km: [0.48, 'kgCO2e/vehículo-km', `${KONTAX}: 0,192 kgCO2e/pasajero-km con 2,5 pasajeros por vehículo`],
  bus_pasajero_km: [0.089, 'kgCO2e/pasajero-km', KONTAX],
  avion_domestico: [0.255, 'kgCO2e/pasajero-km', `${KONTAX}: tramos < 1.500 km`],
  avion_regional: [0.195, 'kgCO2e/pasajero-km', `${KONTAX}: tramos de 1.500 a 3.500 km`],
  avion_internacional: [0.15, 'kgCO2e/pasajero-km', `${KONTAX}: tramos > 3.500 km. No incluye forzamiento radiativo.`],

  // Distancias
  sinuosidad_vial: [1.3, 'factor', `${SUPUESTO}: distancia por carretera igual a la distancia en línea recta × 1,3`],
  ajuste_ruta_aerea: [1.08, 'factor', `${SUPUESTO}: +8 % sobre la distancia ortodrómica por desvíos de ruta (práctica habitual en inventarios de viajes)`],
  km_misma_ciudad: [10, 'km por tramo', `${SUPUESTO}: traslado dentro de la ciudad del evento`],

  // Residuos
  residuo_vertedero: [0.517, 'kgCO2e/kg', KONTAX],
  residuo_incineracion: [0.21, 'kgCO2e/kg', KONTAX],
  residuo_compostaje: [0.05, 'kgCO2e/kg', KONTAX],
  residuo_reciclaje_proceso: [0.02, 'kgCO2e/kg', KONTAX],
  evitada_plastico: [1.2, 'kgCO2e/kg', `${KONTAX}. Se informa aparte; no se descuenta del inventario.`],
  evitada_papel: [0.7, 'kgCO2e/kg', `${KONTAX}. Se informa aparte; no se descuenta del inventario.`],
  evitada_vidrio: [0.314, 'kgCO2e/kg', `${KONTAX}. Se informa aparte; no se descuenta del inventario.`],
  evitada_aluminio: [9.0, 'kgCO2e/kg', `${KONTAX}. Se informa aparte; no se descuenta del inventario.`],

  // Alimentos
  carne_vacuno: [27.0, 'kgCO2e/kg', KONTAX],
  carne_cerdo: [12.1, 'kgCO2e/kg', KONTAX],
  carne_pollo: [6.9, 'kgCO2e/kg', KONTAX],
  pescado: [5.5, 'kgCO2e/kg', KONTAX],
  lacteos_queso: [13.5, 'kgCO2e/kg', KONTAX],
  lacteos_leche: [1.9, 'kgCO2e/kg', KONTAX],
  huevos: [4.8, 'kgCO2e/kg', KONTAX],
  legumbres: [0.9, 'kgCO2e/kg', KONTAX],
  cereales: [2.7, 'kgCO2e/kg', KONTAX],
  frutas_verduras: [2.0, 'kgCO2e/kg', KONTAX],
  envase_desechable: [0.09, 'kgCO2e/unidad', `${KONTAX}: 15 g por envase × 6 kgCO2e/kg`],

  // Agua
  agua_red: [0.344, 'kgCO2e/m³', KONTAX],
  agua_embotellada: [0.244, 'kgCO2e/L', KONTAX],

  // Estimaciones sin medición
  infraestructura_estimada_t_por_mil: [0.75, 'tCO2e por 1.000 asistentes', KONTAX],
  otros_estimado_t_por_mil: [0.2, 'tCO2e por 1.000 asistentes', KONTAX],
};

export const FACTORES = Object.fromEntries(Object.entries(DEFINICION).map(([k, [v]]) => [k, v]));
export const META_FACTORES = Object.fromEntries(
  Object.entries(DEFINICION).map(([k, [valor, unidad, fuente]]) => [k, { valor, unidad, fuente }]),
);

// Ciudades con coordenadas aproximadas (centro urbano). Las chilenas pueden ser sede del evento.
// km fijo: opciones genéricas sin coordenadas, con distancia representativa desde Antofagasta.
export const CIUDADES = [
  // Región de Antofagasta
  { id: 'antofagasta', nombre: 'Antofagasta', grupo: 'Región de Antofagasta', lat: -23.65, lng: -70.4, sede: true },
  { id: 'mejillones', nombre: 'Mejillones', grupo: 'Región de Antofagasta', lat: -23.1, lng: -70.45, sede: true },
  { id: 'sierra_gorda', nombre: 'Sierra Gorda', grupo: 'Región de Antofagasta', lat: -22.89, lng: -69.32, sede: true },
  { id: 'taltal', nombre: 'Taltal', grupo: 'Región de Antofagasta', lat: -25.4, lng: -70.48, sede: true },
  { id: 'calama', nombre: 'Calama', grupo: 'Región de Antofagasta', lat: -22.46, lng: -68.93, sede: true },
  { id: 'ollague', nombre: 'Ollagüe', grupo: 'Región de Antofagasta', lat: -21.22, lng: -68.25, sede: true },
  { id: 'san_pedro', nombre: 'San Pedro de Atacama', grupo: 'Región de Antofagasta', lat: -22.91, lng: -68.2, sede: true },
  { id: 'tocopilla', nombre: 'Tocopilla', grupo: 'Región de Antofagasta', lat: -22.09, lng: -70.2, sede: true },
  { id: 'maria_elena', nombre: 'María Elena', grupo: 'Región de Antofagasta', lat: -22.35, lng: -69.66, sede: true },
  // Resto de Chile
  { id: 'arica', nombre: 'Arica', grupo: 'Resto de Chile', lat: -18.48, lng: -70.31, sede: true },
  { id: 'iquique', nombre: 'Iquique', grupo: 'Resto de Chile', lat: -20.21, lng: -70.15, sede: true },
  { id: 'copiapo', nombre: 'Copiapó', grupo: 'Resto de Chile', lat: -27.37, lng: -70.33, sede: true },
  { id: 'la_serena', nombre: 'La Serena / Coquimbo', grupo: 'Resto de Chile', lat: -29.9, lng: -71.25, sede: true },
  { id: 'santiago', nombre: 'Santiago', grupo: 'Resto de Chile', lat: -33.45, lng: -70.67, sede: true },
  { id: 'valparaiso', nombre: 'Valparaíso / Viña del Mar', grupo: 'Resto de Chile', lat: -33.05, lng: -71.62, sede: true },
  { id: 'concepcion', nombre: 'Concepción', grupo: 'Resto de Chile', lat: -36.83, lng: -73.05, sede: true },
  { id: 'temuco', nombre: 'Temuco', grupo: 'Resto de Chile', lat: -38.74, lng: -72.6, sede: true },
  { id: 'puerto_montt', nombre: 'Puerto Montt', grupo: 'Resto de Chile', lat: -41.47, lng: -72.94, sede: true },
  { id: 'punta_arenas', nombre: 'Punta Arenas', grupo: 'Resto de Chile', lat: -53.16, lng: -70.92, sede: true },
  // Sudamérica
  { id: 'la_paz', nombre: 'La Paz, Bolivia', grupo: 'Sudamérica', lat: -16.5, lng: -68.15 },
  { id: 'lima', nombre: 'Lima, Perú', grupo: 'Sudamérica', lat: -12.05, lng: -77.04 },
  { id: 'buenos_aires', nombre: 'Buenos Aires, Argentina', grupo: 'Sudamérica', lat: -34.6, lng: -58.38 },
  { id: 'salta', nombre: 'Salta / Jujuy, Argentina', grupo: 'Sudamérica', lat: -24.79, lng: -65.41 },
  { id: 'sao_paulo', nombre: 'São Paulo, Brasil', grupo: 'Sudamérica', lat: -23.55, lng: -46.63 },
  { id: 'bogota', nombre: 'Bogotá, Colombia', grupo: 'Sudamérica', lat: 4.71, lng: -74.07 },
  { id: 'otro_sudamerica', nombre: 'Otra ciudad de Sudamérica', grupo: 'Sudamérica', km: 2500 },
  // Norteamérica
  { id: 'ciudad_mexico', nombre: 'Ciudad de México', grupo: 'Norteamérica', lat: 19.43, lng: -99.13 },
  { id: 'washington', nombre: 'Washington D. C., EE. UU.', grupo: 'Norteamérica', lat: 38.91, lng: -77.04 },
  { id: 'nueva_york', nombre: 'Nueva York, EE. UU.', grupo: 'Norteamérica', lat: 40.71, lng: -74.01 },
  { id: 'denver', nombre: 'Denver / oeste de EE. UU.', grupo: 'Norteamérica', lat: 39.74, lng: -104.99 },
  { id: 'toronto', nombre: 'Toronto, Canadá', grupo: 'Norteamérica', lat: 43.65, lng: -79.38 },
  { id: 'vancouver', nombre: 'Vancouver, Canadá', grupo: 'Norteamérica', lat: 49.28, lng: -123.12 },
  // Europa
  { id: 'madrid', nombre: 'Madrid, España', grupo: 'Europa', lat: 40.42, lng: -3.7 },
  { id: 'paris', nombre: 'París, Francia', grupo: 'Europa', lat: 48.86, lng: 2.35 },
  { id: 'londres', nombre: 'Londres, Reino Unido', grupo: 'Europa', lat: 51.51, lng: -0.13 },
  { id: 'bruselas', nombre: 'Bruselas, Bélgica', grupo: 'Europa', lat: 50.85, lng: 4.35 },
  { id: 'berlin', nombre: 'Berlín, Alemania', grupo: 'Europa', lat: 52.52, lng: 13.4 },
  { id: 'estocolmo', nombre: 'Estocolmo, Suecia', grupo: 'Europa', lat: 59.33, lng: 18.07 },
  { id: 'otro_europa', nombre: 'Otra ciudad de Europa', grupo: 'Europa', km: 11000 },
  // Asia y Oceanía
  { id: 'sidney', nombre: 'Sídney, Australia', grupo: 'Asia y Oceanía', lat: -33.87, lng: 151.21 },
  { id: 'perth', nombre: 'Perth, Australia', grupo: 'Asia y Oceanía', lat: -31.95, lng: 115.86 },
  { id: 'tokio', nombre: 'Tokio, Japón', grupo: 'Asia y Oceanía', lat: 35.68, lng: 139.69 },
  { id: 'seul', nombre: 'Seúl, Corea del Sur', grupo: 'Asia y Oceanía', lat: 37.57, lng: 126.98 },
  { id: 'pekin', nombre: 'Pekín, China', grupo: 'Asia y Oceanía', lat: 39.9, lng: 116.4 },
  { id: 'otro_mundo', nombre: 'Otro país', grupo: 'Asia y Oceanía', km: 15000 },
];

export const CIUDAD_POR_ID = Object.fromEntries(CIUDADES.map((c) => [c.id, c]));
export const SEDES = CIUDADES.filter((c) => c.sede);

export const MODOS = [
  { id: 'auto', nombre: 'Auto particular' },
  { id: 'bus', nombre: 'Bus o transporte público' },
  { id: 'taxi', nombre: 'Taxi o aplicación' },
  { id: 'avion', nombre: 'Avión' },
  { id: 'activo', nombre: 'A pie o bicicleta' },
];

// Traslado entre el aeropuerto y el evento, para quienes llegan en avión.
export const MODOS_LOCALES = [
  { id: 'taxi', nombre: 'Taxi o aplicación' },
  { id: 'transfer', nombre: 'Transfer o bus del evento' },
  { id: 'bus', nombre: 'Bus o transporte público' },
  { id: 'auto', nombre: 'Auto arrendado o particular' },
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

// Criterios Evento Verde: autoevaluación según KONTAX Events, no es una certificación de tercera parte.
// El criterio por asistente excluye vuelos para que los eventos con delegaciones internacionales
// puedan evaluarse por lo que el organizador sí controla.
export const CRITERIOS_VERDE = {
  max_kg_por_asistente_sin_vuelos: 15,
  min_reciclaje_pct: 60,
  min_renovable_pct: 30,
};

export const CATEGORIAS = [
  { id: 'transporte', nombre: 'Transporte de asistentes', alcance: 3 },
  { id: 'alojamiento', nombre: 'Alojamiento', alcance: 3 },
  { id: 'energia', nombre: 'Energía', alcance: null }, // se reparte entre alcance 1 y 2
  { id: 'residuos', nombre: 'Residuos', alcance: 3 },
  { id: 'catering', nombre: 'Catering y alimentos', alcance: 3 },
  { id: 'agua', nombre: 'Agua', alcance: 3 },
  { id: 'infraestructura', nombre: 'Infraestructura temporal', alcance: 3 },
  { id: 'otros', nombre: 'Otros', alcance: 3 },
];

// Combustibles quemados en el evento (alcance 1) y electricidad comprada (alcance 2),
// desde la perspectiva del organizador según el GHG Protocol.
export const ALCANCE_ENERGIA = {
  diesel: 1,
  gasolina: 1,
  gas_natural: 1,
  glp: 1,
  electricidad_red: 2,
  electricidad_renovable: 2,
};
