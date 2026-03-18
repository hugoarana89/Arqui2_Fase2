// ──────────────────────────────────────────────
//  plantState — estado global de la planta en RAM
//  Fuente de verdad para WebSockets y monitoreo.
//  Se actualiza en cada mensaje MQTT entrante.
// ──────────────────────────────────────────────

export interface PlantState {
  // Parqueo
  parqueos_ocupados: number;
  talanquera_abierta: boolean;
  alerta_parqueo_lleno: boolean;

  // Acceso
  puerta_abierta: boolean;
  alerta_rfid: boolean;

  // Bandas
  banda_principal: boolean;
  banda_plastico: boolean;
  banda_vidrio: boolean;
  banda_metal: boolean;

  // Clasificador
  codigo_material: number; // 0=plastico | 1=vidrio | 2=metal

  // Seguridad
  alerta_humo: boolean;
  umbral_humo: number;
  modo_emergencia: boolean;

  // Control
  iluminacion: boolean;

  // Almacén (porcentaje 0-100 calculado sobre un máximo de 10 unidades)
  almacen_plastico: number;
  almacen_vidrio: number;
  almacen_metal: number;

  // Contadores internos de unidades (para el cálculo)
  _unidades_plastico: number;
  _unidades_vidrio: number;
  _unidades_metal: number;
  readonly almacen_max: number;

  // Timestamp de la última actualización
  last_updated: string;
}

// ── Valores iniciales ────────
const state: PlantState = {
  parqueos_ocupados: 0,
  talanquera_abierta: false,
  alerta_parqueo_lleno: false,

  puerta_abierta: false,
  alerta_rfid: false,

  banda_principal: false,
  banda_plastico: false,
  banda_vidrio: false,
  banda_metal: false,

  codigo_material: 0,

  alerta_humo: false,
  umbral_humo: 0,
  modo_emergencia: false,

  iluminacion: false,

  almacen_plastico: 0,
  almacen_vidrio: 0,
  almacen_metal: 0,

  _unidades_plastico: 0,  // si el valor es 40 entonces 40% de 20
  _unidades_vidrio: 0,    // si el valor es 80 entonces 80% de 20
  _unidades_metal: 0,     // si el valor es 10 entonces 10% de 20
  almacen_max: 20, // numero máximo de unidades por línea (para el cálculo de porcentaje)

  last_updated: new Date().toISOString(),
};

// ── Getters / setters tipados ──────────────────

/** Devuelve una copia del estado (sin exponer el objeto mutable) */
export const getState = (): PlantState => ({ ...state });

/** Devuelve el estado público (sin los contadores internos _unidades_*) */
export const getPublicState = (): Omit<PlantState, '_unidades_plastico' | '_unidades_vidrio' | '_unidades_metal'> => {
  const { _unidades_plastico: _p, _unidades_vidrio: _v, _unidades_metal: _m, ...pub } = state;
  return pub;
};

/** Actualiza uno o varios campos del estado */
export const updateState = (partial: Partial<PlantState>): void => {
  Object.assign(state, partial, { last_updated: new Date().toISOString() });
};

/**
 * Registra un resultado de clasificación aprobado.
 * Incrementa el contador de unidades y recalcula el porcentaje.
 * Retorna el nuevo porcentaje.
 */
export const incrementAlmacen = (linea: 'plastico' | 'vidrio' | 'metal'): number => {
  const maxUnidades = state.almacen_max;

  if (linea === 'plastico') {
    state._unidades_plastico = Math.min(state._unidades_plastico + 1, maxUnidades);
    state.almacen_plastico = Math.round((state._unidades_plastico / maxUnidades) * 100);
    state.last_updated = new Date().toISOString();
    return state.almacen_plastico;
  }
  if (linea === 'vidrio') {
    state._unidades_vidrio = Math.min(state._unidades_vidrio + 1, maxUnidades);
    state.almacen_vidrio = Math.round((state._unidades_vidrio / maxUnidades) * 100);
    state.last_updated = new Date().toISOString();
    return state.almacen_vidrio;
  }
  // metal
  state._unidades_metal = Math.min(state._unidades_metal + 1, maxUnidades);
  state.almacen_metal = Math.round((state._unidades_metal / maxUnidades) * 100);
  state.last_updated = new Date().toISOString();
  return state.almacen_metal;
};
