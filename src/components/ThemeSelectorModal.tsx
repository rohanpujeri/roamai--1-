import React from 'react';
import { Palette, Check, X } from 'lucide-react';
import { ThemeConfig, ThemeId } from '../types';
import { THEME_OPTIONS } from '../services/theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: ThemeConfig;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="rounded-3xl max-w-md w-full shadow-2xl border p-6 relative transition-colors duration-300 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0"
            style={{ background: currentTheme.heroGradient }}
          >
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Select Theme
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose your travel atmosphere & colors
            </p>
          </div>
        </div>

        {/* Theme List */}
        <div className="space-y-2.5 mb-5">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = currentTheme.id === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                  onClose();
                }}
                style={isSelected ? {
                  borderColor: theme.primaryColor,
                  backgroundColor: `${theme.primaryColor}10`
                } : undefined}
                className={`w-full px-4 py-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${isSelected
                  ? 'border-cyan-500 font-bold shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-white dark:bg-slate-900/60 font-medium'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{theme.icon}</span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3.5 h-3.5 rounded-full shadow-2xs shrink-0"
                      style={{ backgroundColor: theme.primaryColor }}
                    />
                    <span className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
                      {theme.name}
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shadow-xs shrink-0"
                    style={{ backgroundColor: theme.primaryColor }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Done Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
