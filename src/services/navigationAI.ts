import { apiRequest } from './api';

export type ChatResponse =
  | { tipo: 'navegacion'; datos: { accion: string; ruta: string } }
  | { tipo: 'texto'; datos: string };

export async function sendChatMessage(
  mensaje: string,
  usuarioId: string,
): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/navigation-ai/chat', {
    method: 'POST',
    body: JSON.stringify({ mensaje, usuarioId }),
  });
}
