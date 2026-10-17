import { useToast } from 'primevue/usetoast';
import { describeApiError } from '../api/errors';

const LIFE_MS = 4000;

export function useNotify() {
  const toast = useToast();

  return {
    success(summary: string, detail?: string) {
      toast.add({ severity: 'success', summary, detail, life: LIFE_MS });
    },
    info(summary: string, detail?: string) {
      toast.add({ severity: 'info', summary, detail, life: LIFE_MS });
    },
    warn(summary: string, detail?: string) {
      toast.add({ severity: 'warn', summary, detail, life: LIFE_MS + 2000 });
    },
    error(error: unknown, summary = 'No se pudo completar la operación') {
      toast.add({ severity: 'error', summary, detail: describeApiError(error), life: LIFE_MS + 2000 });
    },
  };
}
