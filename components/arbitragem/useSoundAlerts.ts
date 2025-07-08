import { useState, useEffect } from 'react';

interface SoundAlertConfig {
  [symbol: string]: boolean;
}

export function useSoundAlerts() {
  const [alertConfigs, setAlertConfigs] = useState<SoundAlertConfig>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar configurações do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sound-alerts-config');
      if (saved) {
        const config = JSON.parse(saved);
        setAlertConfigs(config);
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de alerta sonoro:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Salvar configurações no localStorage
  const saveConfig = (config: SoundAlertConfig) => {
    try {
      localStorage.setItem('sound-alerts-config', JSON.stringify(config));
    } catch (error) {
      console.warn('Erro ao salvar configurações de alerta sonoro:', error);
    }
  };

  // Ativar/desativar alerta para um símbolo específico
  const toggleAlert = (symbol: string, enabled: boolean) => {
    const newConfig = {
      ...alertConfigs,
      [symbol]: enabled
    };
    setAlertConfigs(newConfig);
    saveConfig(newConfig);
  };

  // Verificar se o alerta está ativo para um símbolo
  const isAlertEnabled = (symbol: string): boolean => {
    return alertConfigs[symbol] === true;
  };

  // Ativar todos os alertas
  const enableAllAlerts = () => {
    const newConfig = Object.keys(alertConfigs).reduce((acc, symbol) => {
      acc[symbol] = true;
      return acc;
    }, {} as SoundAlertConfig);
    setAlertConfigs(newConfig);
    saveConfig(newConfig);
  };

  // Desativar todos os alertas
  const disableAllAlerts = () => {
    const newConfig = Object.keys(alertConfigs).reduce((acc, symbol) => {
      acc[symbol] = false;
      return acc;
    }, {} as SoundAlertConfig);
    setAlertConfigs(newConfig);
    saveConfig(newConfig);
  };

  // Adicionar novo símbolo à configuração
  const addSymbol = (symbol: string, enabled: boolean = true) => {
    if (!alertConfigs.hasOwnProperty(symbol)) {
      const newConfig = {
        ...alertConfigs,
        [symbol]: enabled
      };
      setAlertConfigs(newConfig);
      saveConfig(newConfig);
    }
  };

  return {
    alertConfigs,
    isLoaded,
    toggleAlert,
    isAlertEnabled,
    enableAllAlerts,
    disableAllAlerts,
    addSymbol
  };
} 