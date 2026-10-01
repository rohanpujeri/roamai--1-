import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';
import { deleteUserAccountCompletely } from '../services/accountDeletionService';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username?: string;
  email?: string;
  onDeleted?: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  userId,
  username,
  email,
  onDeleted
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || typeof document === 'undefined') return null;

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deleteUserAccountCompletely({ userId, username, email });
      if (res.success) {
        if (onDeleted) {
          onDeleted();
        } else {
          window.location.href = '/';
        }
      } else {
        setErrorMessage(res.error || 'Failed to delete account. Please try again.');
        setIsDeleting(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unexpected error deleting account.');
      setIsDeleting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={() => {
        if (!isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-left relative overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.25)'
        }}
      >
        {/* Subtle Ambient Red Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Title */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-3 shadow-inner">
            <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
            Permanently Delete Account?
          </h3>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xs">
            This will permanently remove your account and wipe all your data from TripWise.
          </p>
        </div>

        {/* Warning List */}
        <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-2 mb-5 text-xs text-zinc-300">
          <div className="flex items-start gap-2 text-red-300 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>The following items will be permanently erased:</span>
          </div>
          <ul className="space-y-1.5 pl-5 list-disc text-zinc-400 text-[11px] sm:text-xs">
            <li>All your saved, active & completed travel itineraries</li>
            <li>All your uploaded travel trail videos, photos & captions</li>
            <li>Your <span className="text-zinc-200 font-bold">@{username || 'handle'}</span> username reservation</li>
            <li>Your travel stats, followers & community interactions</li>
          </ul>
        </div>

        {/* Confirmation Input Field */}
        <div className="space-y-2 mb-5">
          <label className="block text-xs font-semibold text-zinc-300">
            To proceed, type <span className="font-mono font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-800/60">DELETE</span> below:
          </label>
          <input
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={isDeleting}
            placeholder="DELETE"
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:border-red-500 text-white font-mono text-sm uppercase tracking-wider focus:outline-hidden transition-all disabled:opacity-50"
            autoFocus
          />
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white font-semibold text-xs sm:text-sm border border-zinc-800 transition-all cursor-pointer disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              isConfirmed && !isDeleting
                ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-red-600/30 active:scale-95'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
            }`}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
