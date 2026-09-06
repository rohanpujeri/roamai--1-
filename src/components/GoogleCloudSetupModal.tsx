import React, { useState } from 'react';
import {
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  AlertTriangle,
  Key,
  ShieldCheck,
  Globe,
  Layers
} from 'lucide-react';

interface GoogleCloudSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleCloudSetupModal: React.FC<GoogleCloudSetupModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedKeyName, setCopiedKeyName] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyName(label);
    setTimeout(() => setCopiedKeyName(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-left space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Google Cloud Setup Instructions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How to enable Google Maps JavaScript API & Places API (New)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Step 1: Google Cloud Console */}
        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  Create or Select a Google Cloud Project
                </h4>
                <a
                  href="https://console.cloud.google.com/projectcreate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <span>Open Console</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Go to Google Cloud Console, create a new project or select an existing one, and make sure Billing is linked to the project.
              </p>
            </div>
          </div>

          {/* Step 2: Enable Required APIs */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Enable Maps & Places APIs in API Library
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Navigate to <strong>APIs &amp; Services &gt; Library</strong> and enable the following two APIs:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Maps JavaScript API
                  </span>
                  <a
                    href="https://console.cloud.google.com/marketplace/product/google/maps-backend.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    Places API (New)
                  </span>
                  <a
                    href="https://console.cloud.google.com/marketplace/product/google/places-backend.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Create API Key & Configure Restrictions */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Generate API Key &amp; Secure It
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Go to <strong>APIs &amp; Services &gt; Credentials &gt; Create Credentials &gt; API Key</strong>.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Recommended Key Restrictions:</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                  <li>Set <strong>Application restrictions</strong> to Website / HTTP referrers.</li>
                  <li>Set <strong>API restrictions</strong> to strictly allow <em>Maps JavaScript API</em>, <em>Places API (New)</em>, and <em>Geocoding API</em>.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 4: Environment Variable */}
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
              4
            </span>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                Configure Environment Variable
              </h4>
              <p className="text-slate-600 dark:text-slate-400">
                Add your key to <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">.env.example</code> or your environment secrets:
              </p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px]">
                <code>VITE_GOOGLE_MAPS_API_KEY="YOUR_API_KEY"</code>
                <button
                  onClick={() => copyToClipboard('VITE_GOOGLE_MAPS_API_KEY="YOUR_API_KEY"', 'env')}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy snippet"
                >
                  {copiedKeyName === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-md transition-all"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
