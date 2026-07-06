// components/DeleteConfirmPopup.tsx
"use client";

import { X, AlertTriangle, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";

interface DeleteConfirmPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  scheduleName: string;
  isDeleting?: boolean;
}

export function DeleteConfirmPopup({
  isOpen,
  onClose,
  onConfirm,
  scheduleName,
  isDeleting = false,
}: DeleteConfirmPopupProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Lock scroll saat popup terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Focus ke tombol confirm untuk aksesibilitas
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Handle keyboard events (Enter untuk confirm, Escape untuk close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !isDeleting) {
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onConfirm, isDeleting]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            disabled={isDeleting}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Icon */}
          <div className="flex flex-col items-center pt-6 pb-4">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Hapus Jadwal?
            </h3>
            
            <p className="text-gray-500 text-center px-6 mb-1">
              Apakah Anda yakin ingin menghapus jadwal
            </p>
            <p className="text-gray-800 font-semibold text-center px-6 mb-6">
              "{scheduleName}"
            </p>

            <p className="text-sm text-red-500 text-center px-6 mb-6 flex items-center gap-2">
              <span>⚠️</span> Tindakan ini tidak dapat dibatalkan
            </p>

            {/* Buttons */}
            <div className="flex gap-3 w-full px-6 pb-6">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                ref={confirmButtonRef}
                onClick={onConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {isDeleting ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Hapus
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}