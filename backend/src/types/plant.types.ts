import type { ObjectId } from 'mongodb';

// ──────────────────────────────────────────────
//  Tipos de documentos MongoDB para IoT
// ──────────────────────────────────────────────

/** Evento genérico de sensor — colección sensor_events */
export interface SensorEventDocument {
  _id?: ObjectId;
  topic: string;
  category: string;
  payload: Record<string, unknown>;
  receivedAt: Date;
}

/** Resultado de clasificación — colección classification_results */
export interface ClassificationResultDocument {
  _id?: ObjectId;
  linea: 'plastico' | 'vidrio' | 'metal';
  resultado: 'aprobado' | 'rechazado';
  medicion: number | null;
  transparencia: number | null;
  porcentaje_almacen_tras_evento: number | null;
  timestamp: Date;
}

/** Log de comandos enviados desde el frontend — colección commands_log */
export interface CommandLogDocument {
  _id?: ObjectId;
  topic: string;
  comando: string;
  payload: Record<string, unknown>;
  userId: ObjectId;
  userName: string;
  sentAt: Date;
  status: 'sent' | 'error';
  errorMessage?: string;
}

// ──────────────────────────────────────────────
//  Payloads MQTT entrantes (Raspberry → backend)
// ──────────────────────────────────────────────
export interface ParqueosPayload   { timestamp: string; parqueos_ocupados: number }
export interface TalanqueraPayload { timestamp: string; talanquera_abierta: boolean }
export interface AlertaParqueoPayload { timestamp: string; alerta_parqueo_lleno: boolean }
export interface PuertaPayload     { timestamp: string; puerta_abierta: boolean }
export interface AlarmRfidPayload  { timestamp: string; alerta_rfid: boolean }
export interface BandaPayload      { timestamp: string; banda_principal?: boolean; banda_plastico?: boolean; banda_vidrio?: boolean; banda_metal?: boolean }
export interface MaterialDetectadoPayload { timestamp: string; codigo_material: number }
export interface MaterialResultadoPayload {
  timestamp: string;
  linea: 'plastico' | 'vidrio' | 'metal';
  resultado: 'aprobado' | 'rechazado';
  medicion?: number;
  transparencia?: number;
}
export interface HumoPayload { timestamp: string; alerta_humo: boolean; umbral: number }

// ──────────────────────────────────────────────
//  Verificación EPP (backend ↔ servicio ML EPP)
// ──────────────────────────────────────────────
export interface EppVerifyRequestDTO {
  imageBase64: string;
  source?: string;
}

export interface EppServiceResponse {
  access_granted: boolean;
  missing_mandatory: string[];
  detections: Record<string, number>;
  annotated_image_base64: string;
}

export interface EppVerificationDocument {
  _id?: ObjectId;
  access_granted: boolean;
  missing_mandatory: string[];
  detections: Record<string, number>;
  source: string;
  createdAt: Date;
}

// ──────────────────────────────────────────────
//  Detección de placas (backend ↔ servicio ML de placas)
// ──────────────────────────────────────────────
export interface PlateDetectRequestDTO {
  imageBase64: string;
  source?: string;
}

export interface PlateServiceCandidateDTO {
  text: string;
  confidence: number;
}

export interface PlateServiceResponse {
  success: boolean;
  plate: string | null;
  confidence?: number | null;
  candidates?: PlateServiceCandidateDTO[];
  message?: string;
}

export interface PlateValidateRequestDTO {
  plate?: string | null;
  confidence?: number | null;
  source?: string;
}

// ──────────────────────────────────────────────
//  Payloads HTTP de comandos (frontend → backend)
// ──────────────────────────────────────────────
export interface LineaComandoDTO {
  comando: 'pausar' | 'reanudar';
  linea: 'principal' | 'plastico' | 'vidrio' | 'metal';
}

export interface AccesoComandoDTO {
  comando: 'abrir' | 'cerrar';
  elemento: 'puerta_principal' | 'talanquera';
}

export interface IluminacionComandoDTO {
  comando: 'encender' | 'apagar';
}

export interface EmergenciaComandoDTO {
  comando: 'activar' | 'desactivar';
  motivo?: string;
}

export interface AlmacenComandoDTO {
  comando: 'reset' | 'set_max';
  linea?: 'plastico' | 'vidrio' | 'metal';
  max_unidades?: number; // Solo para set_max
}
