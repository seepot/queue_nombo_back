"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ==================== TYPES ====================
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info" | "primary";
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ToastConfirmContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastConfirmContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// ==================== PROVIDER COMPONENT ====================
export function ToastConfirmProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    options: ConfirmDialogOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Add Toast
  const addToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, title, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message: string, title?: string) => addToast("success", message, title),
    error: (message: string, title?: string) => addToast("error", message, title),
    warning: (message: string, title?: string) => addToast("warning", message, title),
    info: (message: string, title?: string) => addToast("info", message, title),
  };

  // Promise-based Modern Confirmation Dialog
  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmDialog({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = async () => {
    if (confirmDialog) {
      if (confirmDialog.options.onConfirm) {
        await confirmDialog.options.onConfirm();
      }
      confirmDialog.resolve(true);
      setConfirmDialog(null);
    }
  };

  const handleCancelAction = () => {
    if (confirmDialog) {
      if (confirmDialog.options.onCancel) {
        confirmDialog.options.onCancel();
      }
      confirmDialog.resolve(false);
      setConfirmDialog(null);
    }
  };

  return (
    <ToastConfirmContext.Provider value={{ toast, confirm }}>
      {children}

      {/* ==================== TOAST CONTAINER ==================== */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto rounded-2xl p-4 shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${
                isSuccess
                  ? "bg-emerald-950/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/30"
                  : isError
                  ? "bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/30"
                  : isWarning
                  ? "bg-amber-950/90 border-amber-500/40 text-amber-100 shadow-amber-950/30"
                  : "bg-slate-900/90 border-slate-700 text-slate-100 shadow-slate-950/30"
              }`}
            >
              <span className="text-xl shrink-0">
                {isSuccess ? "✅" : isError ? "❌" : isWarning ? "⚠️" : "ℹ️"}
              </span>
              <div className="flex-1 min-w-0">
                {t.title && (
                  <h5 className="text-xs font-black uppercase tracking-wider mb-0.5 text-white">
                    {t.title}
                  </h5>
                )}
                <p className="text-xs font-medium leading-relaxed opacity-95">
                  {t.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-white/60 hover:text-white transition text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* ==================== CONFIRM DIALOG MODAL ==================== */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div
                className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner ${
                  confirmDialog.options.type === "danger"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : confirmDialog.options.type === "warning"
                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
              >
                {confirmDialog.options.type === "danger"
                  ? "🗑️"
                  : confirmDialog.options.type === "warning"
                  ? "⚠️"
                  : "❓"}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900">
                  {confirmDialog.options.title || "Pengesahan Tindakan"}
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
                  {confirmDialog.options.message}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelAction}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                {confirmDialog.options.cancelText || "Batal"}
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition cursor-pointer ${
                  confirmDialog.options.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                    : confirmDialog.options.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                }`}
              >
                {confirmDialog.options.confirmText || "Ya, Teruskan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastConfirmContext.Provider>
  );
}
