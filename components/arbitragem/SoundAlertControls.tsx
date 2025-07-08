'use client';

import { useState } from 'react';
import { Volume2, VolumeX, Settings, Bell } from 'lucide-react';
import { useSoundAlerts } from './useSoundAlerts';

export default function SoundAlertControls() {
  const { 
    alertConfigs, 
    isLoaded, 
    enableAllAlerts, 
    disableAllAlerts 
  } = useSoundAlerts();
  
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoaded) {
    return null;
  }

  const enabledCount = Object.values(alertConfigs).filter(Boolean).length;
  const totalCount = Object.keys(alertConfigs).length;

  return (
    <div className="bg-dark-card p-4 rounded-lg shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-custom-cyan" />
          <h3 className="text-lg font-semibold text-white">Alertas Sonoros</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-400">
          {enabledCount} de {totalCount} alertas ativos
        </div>
        <div className="flex gap-2">
          <button
            onClick={enableAllAlerts}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
            disabled={enabledCount === totalCount}
          >
            <Volume2 className="h-3 w-3" />
            Ativar Todos
          </button>
          <button
            onClick={disableAllAlerts}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
            disabled={enabledCount === 0}
          >
            <VolumeX className="h-3 w-3" />
            Desativar Todos
          </button>
        </div>
      </div>

      {isExpanded && totalCount > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Símbolos Monitorados:</h4>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {Object.entries(alertConfigs).map(([symbol, enabled]) => (
              <div
                key={symbol}
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  enabled ? 'bg-green-600/20 text-green-400' : 'bg-gray-700/50 text-gray-400'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  enabled ? 'bg-green-400' : 'bg-gray-500'
                }`} />
                <span className="font-mono">{symbol}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="text-center py-4 text-gray-500">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum símbolo monitorado</p>
          <p className="text-xs">Os alertas aparecerão quando houver oportunidades de arbitragem</p>
        </div>
      )}
    </div>
  );
} 