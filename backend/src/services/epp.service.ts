import { BadRequestError } from '../middlewares/error.middleware.js';
import type { EppServiceResponse } from '../types/plant.types.js';

const EPP_SERVICE_URL = process.env['EPP_SERVICE_URL'] ?? 'http://localhost:8001';

const stripBase64Prefix = (imageBase64: string): string => {
  const marker = 'base64,';
  const idx = imageBase64.indexOf(marker);
  return idx >= 0 ? imageBase64.slice(idx + marker.length) : imageBase64;
};

const isValidEppResponse = (data: unknown): data is EppServiceResponse => {
  if (!data || typeof data !== 'object') return false;

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate['access_granted'] === 'boolean' &&
    Array.isArray(candidate['missing_mandatory']) &&
    typeof candidate['detections'] === 'object' &&
    candidate['detections'] !== null &&
    typeof candidate['annotated_image_base64'] === 'string'
  );
};

export const verifyPpeImage = async (imageBase64: string): Promise<EppServiceResponse> => {
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    throw new BadRequestError('imageBase64 es requerido y debe ser string.');
  }

  const normalized = stripBase64Prefix(imageBase64).trim();
  if (!normalized) throw new BadRequestError('imageBase64 está vacío.');

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(normalized, 'base64');
  } catch {
    throw new BadRequestError('imageBase64 no tiene formato válido.');
  }

  if (!imageBuffer.length) {
    throw new BadRequestError('No se pudo decodificar imageBase64.');
  }

  const formData = new FormData();
  formData.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'frame.jpg');

  const response = await fetch(`${EPP_SERVICE_URL}/api/ppe/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Servicio EPP respondió ${response.status}: ${text}`);
  }

  const parsed = (await response.json()) as unknown;
  if (!isValidEppResponse(parsed)) {
    throw new Error('Respuesta inválida del servicio EPP.');
  }

  return parsed;
};

export const checkEppHealth = async (): Promise<{ status: string; engine_ready?: boolean }> => {
  const response = await fetch(`${EPP_SERVICE_URL}/health`, { method: 'GET' });

  if (!response.ok) {
    throw new Error(`Servicio EPP no disponible (${response.status}).`);
  }

  const parsed = (await response.json()) as Record<string, unknown>;
  return {
    status: typeof parsed['status'] === 'string' ? parsed['status'] : 'unknown',
    engine_ready: typeof parsed['engine_ready'] === 'boolean' ? parsed['engine_ready'] : undefined,
  };
};
