import type { Service } from '../types';
export const PUBLIC_SERVICES: Service[] = [];
export function getServiceById(id: string): Service | undefined { return PUBLIC_SERVICES.find((service) => service.id === id); }
