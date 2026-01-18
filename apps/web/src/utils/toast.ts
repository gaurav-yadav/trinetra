import { useToastStore, type ToastType } from '../stores/toastStore';

const showToast = (message: string, type: ToastType, duration?: number) => {
  return useToastStore.getState().addToast(message, type, duration);
};

export const toast = {
  success: (message: string, duration?: number) => showToast(message, 'success', duration),
  error: (message: string, duration?: number) => showToast(message, 'error', duration),
  info: (message: string, duration?: number) => showToast(message, 'info', duration),
  warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
};
