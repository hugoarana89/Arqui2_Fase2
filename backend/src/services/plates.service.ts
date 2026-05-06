import { BadRequestError } from '../middlewares/error.middleware.js';
import type { PlateServiceResponse } from '../types/plant.types.js';

const PLATES_SERVICE_URL = process.env['PLATES_SERVICE_URL'] ?? 'http://localhost:8000';

const stripBase64Prefix = (imageBase64: string): string => {
  const marker = 'base64,';
  const idx = imageBase64.indexOf(marker);
  return idx >= 0 ? imageBase64.slice(idx + marker.length) : imageBase64;
};

const isValidPlateResponse = (data: unknown): data is PlateServiceResponse => {
  if (!data || typeof data !== 'object') return false;

  const candidate = data as Record<string, unknown>;
  return (
    typeof candidate['success'] === 'boolean' &&
    (typeof candidate['plate'] === 'string' || candidate['plate'] === null) &&
    (candidate['confidence'] === undefined || typeof candidate['confidence'] === 'number' || candidate['confidence'] === null)
  );
};

export const detectPlateImage = async (imageBase64: string): Promise<PlateServiceResponse> => {
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

  const response = await fetch(`${PLATES_SERVICE_URL}/detect-plate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Servicio de placas respondió ${response.status}: ${text}`);
  }

  const parsed = (await response.json()) as unknown;
  if (!isValidPlateResponse(parsed)) {
    throw new Error('Respuesta inválida del servicio de placas.');
  }

  return parsed;
};