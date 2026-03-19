// ──────────────────────────────────────────────
//  Tipos del estado global de la planta (espeja plantState.ts del backend)
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

  // Almacén (%)
  almacen_plastico: number;
  almacen_vidrio: number;
  almacen_metal: number;
  almacen_max: number;

  last_updated: string;
}

// ──────────────────────────────────────────────
//  Tipos para histórico
// ──────────────────────────────────────────────
export interface SensorEvent {
  _id: string;
  topic: string;
  category: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

export interface ClassificationResult {
  _id: string;
  linea: 'plastico' | 'vidrio' | 'metal';
  resultado: 'aprobado' | 'rechazado';
  medicion: number | null;
  transparencia: number | null;
  porcentaje_almacen_tras_evento: number | null;
  timestamp: string;
}

export interface CommandLog {
  _id: string;
  topic: string;
  comando: string;
  payload: Record<string, unknown>;
  userName: string;
  sentAt: string;
  status: 'sent' | 'error';
}

export interface ClassificationStats {
  plastico: { aprobados: number; rechazados: number };
  vidrio:   { aprobados: number; rechazados: number };
  metal:    { aprobados: number; rechazados: number };
}

// ──────────────────────────────────────────────
//  Payloads de comandos HTTP
// ──────────────────────────────────────────────
export type LineaComando = { comando: 'pausar' | 'reanudar'; linea: 'principal' | 'plastico' | 'vidrio' | 'metal' };
export type AccesoComando = { comando: 'abrir' | 'cerrar'; elemento: 'puerta_principal' | 'talanquera' };
export type IluminacionComando = { comando: 'encender' | 'apagar' };
export type EmergenciaComando = { comando: 'activar' | 'desactivar'; motivo?: string };
