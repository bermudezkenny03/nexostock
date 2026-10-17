import { useConfirm } from 'primevue/useconfirm';

export interface ConfirmOptions {
  title: string;
  message: string;
  acceptLabel?: string;
  rejectLabel?: string;
  danger?: boolean;
}

/** Promise-based wrapper over PrimeVue's confirm service (rendered by AppConfirmDialog). */
export function useConfirmAction() {
  const confirm = useConfirm();

  return (options: ConfirmOptions): Promise<boolean> =>
    new Promise((resolve) => {
      confirm.require({
        header: options.title,
        message: options.message,
        icon: options.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
        acceptProps: {
          label: options.acceptLabel ?? 'Confirmar',
          severity: options.danger ? 'danger' : 'primary',
        },
        rejectProps: { label: options.rejectLabel ?? 'Cancelar', severity: 'secondary', outlined: true },
        accept: () => resolve(true),
        reject: () => resolve(false),
        onHide: () => resolve(false),
      });
    });
}
