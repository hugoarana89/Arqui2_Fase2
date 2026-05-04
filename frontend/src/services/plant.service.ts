import type {
  PlantState, SensorEvent, ClassificationResult,
  CommandLog, ClassificationStats, LineaComando,
  AccesoComando, IluminacionComando, EmergenciaComando, AlmacenComando,
  EppVerification,
  PlateDetection,
  AuthorizedPlate,
  CreateAuthorizedPlatePayload,
  UpdateAuthorizedPlatePayload
} from '../types/plant.types';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

const getToken = (): string | null => localStorage.getItem('token');
const authHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Error en la solicitud');
  return data as T;
}

// ── Control (POST) ─────────────────────────────
export const controlService = {
  linea: (payload: LineaComando) =>
    fetch(`${BASE_URL}/control/linea`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    }).then(handleResponse<{ status: string; message: string }>),

  acceso: (payload: AccesoComando) =>
    fetch(`${BASE_URL}/control/acceso`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    }).then(handleResponse<{ status: string; message: string }>),

  iluminacion: (payload: IluminacionComando) =>
    fetch(`${BASE_URL}/control/iluminacion`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    }).then(handleResponse<{ status: string; message: string }>),

  emergencia: (payload: EmergenciaComando) =>
    fetch(`${BASE_URL}/control/emergencia`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    }).then(handleResponse<{ status: string; message: string }>),

  resetAlmacen: (payload: AlmacenComando) =>
    fetch(`${BASE_URL}/control/almacen/reset`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(payload),
    }).then(handleResponse<{ status: string; message: string }>),
};

// ── Monitoring (GET) ───────────────────────────
export const monitoringService = {
  getState: () =>
    fetch(`${BASE_URL}/monitoring/state`, { headers: authHeaders() })
      .then(handleResponse<{ status: string; data: PlantState }>),

  getEvents: (params?: { category?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.limit) q.set('limit', String(params.limit));
    return fetch(`${BASE_URL}/monitoring/events?${q}`, { headers: authHeaders() })
      .then(handleResponse<{ status: string; count: number; data: SensorEvent[] }>);
  },

  getClassifications: (params?: { linea?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.linea) q.set('linea', params.linea);
    if (params?.limit) q.set('limit', String(params.limit));
    return fetch(`${BASE_URL}/monitoring/classifications?${q}`, { headers: authHeaders() })
      .then(handleResponse<{ status: string; count: number; data: ClassificationResult[] }>);
  },

  getClassificationStats: () =>
    fetch(`${BASE_URL}/monitoring/classifications/stats`, { headers: authHeaders() })
      .then(handleResponse<{ status: string; data: ClassificationStats }>),

  getCommands: (limit = 100) =>
    fetch(`${BASE_URL}/monitoring/commands?limit=${limit}`, { headers: authHeaders() })
      .then(handleResponse<{ status: string; count: number; data: CommandLog[] }>),
};


// ── Fase 3: EPP ───────────────────────────────
export const eppService = {
  getVerifications: (limit = 20) =>
    fetch(`${BASE_URL}/epp/verifications?limit=${limit}`, {
      headers: authHeaders(),
    }).then(handleResponse<{ status: string; count: number; data: EppVerification[] }>),

  health: () =>
    fetch(`${BASE_URL}/epp/health`, {
      headers: authHeaders(),
    }).then(handleResponse<{ status: string; data: unknown }>),
};

// ── Fase 3: Placas ────────────────────────────
export const platesService = {
  getAuthorized: () =>
    fetch(`${BASE_URL}/plates/authorized`, {
      headers: authHeaders(),
    }).then(handleResponse<AuthorizedPlate[]>),

  createAuthorized: (payload: CreateAuthorizedPlatePayload) =>
    fetch(`${BASE_URL}/plates/authorized`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<AuthorizedPlate>),

  updateAuthorized: (id: string, payload: UpdateAuthorizedPlatePayload) =>
    fetch(`${BASE_URL}/plates/authorized/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then(handleResponse<AuthorizedPlate>),

  deleteAuthorized: (id: string) =>
    fetch(`${BASE_URL}/plates/authorized/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(handleResponse<{ message: string }>),

  validate: (plate: string, confidence = 0.95) =>
    fetch(`${BASE_URL}/plates/validate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ plate, confidence }),
    }).then(handleResponse<{
      authorized: boolean;
      plate: string | null;
      status: string;
      detection: PlateDetection;
    }>),

  getDetections: () =>
    fetch(`${BASE_URL}/plates/detections`, {
      headers: authHeaders(),
    }).then(handleResponse<PlateDetection[]>),
};