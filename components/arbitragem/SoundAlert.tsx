'use client';

import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Bell } from 'lucide-react';
import { useToastContext } from '@/components/providers/ToastProvider';

interface SoundAlertProps {
  symbol: string;
  currentSpread: number;
  maxSpread24h: number | null;
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  soundFile?: string; // Arquivo de som personalizado
}

export default function SoundAlert({ 
  symbol, 
  currentSpread, 
  maxSpread24h, 
  isEnabled, 
  onToggle,
  soundFile = '/sounds/alerta.mp3'
}: SoundAlertProps) {
  const [isAlerting, setIsAlerting] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertCooldownRef = useRef<number>(30000); // 30 segundos entre alertas
  const { showWarning } = useToastContext();

  // Adicionar um ref para contar as repetições do alerta
  const playCountRef = useRef(0);
  const maxPlays = 3;

  // Criar elemento de áudio para o alerta
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.src = soundFile;
      audioRef.current.volume = 0.7;
      audioRef.current.preload = 'auto';
      
      // Log simples para verificar se o arquivo foi encontrado
      audioRef.current.addEventListener('canplay', () => {
        console.log('✅ Arquivo de som carregado com sucesso:', soundFile);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('❌ ERRO: Arquivo de som não encontrado:', soundFile);
        console.error('Detalhes do erro:', e);
      });
      
      // Atualizar o evento ended para tocar no máximo 3 vezes
      const handleEnded = () => {
        playCountRef.current += 1;
        if (playCountRef.current < maxPlays) {
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(error => {
                console.warn('Erro ao tocar beep extra:', error);
              });
            }
          }, 200);
        }
      };

      const audio = audioRef.current;
      audio.addEventListener('ended', handleEnded);
      return () => {
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [soundFile]);

  // Verificar se deve tocar o alerta
  useEffect(() => {
    if (!isEnabled || !maxSpread24h || maxSpread24h <= 0) {
      return;
    }

    const threshold = maxSpread24h * 0.50; // 50% do spread máximo (TESTE - voltar para 0.95 depois)
    const now = Date.now();

    if (currentSpread >= threshold && 
        now - lastAlertTime > alertCooldownRef.current) {
      
      setIsAlerting(true);
      setLastAlertTime(now);

      // Mostrar notificação toast
      showWarning(
        `Alerta de Spread - ${symbol}`,
        `Spread atual: ${currentSpread.toFixed(2)}% (${((currentSpread / maxSpread24h) * 100).toFixed(0)}% do máximo)`
      );

      // Tocar o som
      if (audioRef.current) {
        playCountRef.current = 0; // Resetar contador
        console.log('🔊 TOCANDO ALERTA para', symbol);
        
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Alerta sonoro tocado com sucesso!');
            })
            .catch(error => {
              console.error('❌ FALHA ao tocar som:', error.message);
              // Tentar com som base64 como fallback
              console.log('🔄 Tentando som base64...');
              const fallbackAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
              fallbackAudio.volume = 0.7;
              fallbackAudio.play().catch(fallbackError => {
                console.error('❌ Erro no som base64 também:', fallbackError);
              });
            });
        }
      }

      // Parar o alerta após 2 segundos
      setTimeout(() => {
        setIsAlerting(false);
      }, 2000);
    }
  }, [currentSpread, maxSpread24h, isEnabled, lastAlertTime]);

  const handleToggle = () => {
    onToggle(!isEnabled);
  };

  // Função para testar o som
  const testSound = () => {
    if (audioRef.current) {
      console.log('🧪 Testando som...');
      
      // Forçar interação do usuário
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Som tocado com sucesso!');
          })
          .catch(error => {
            console.error('❌ Erro no teste de som:', error);
            // Tentar com som base64 como fallback
            console.log('🔄 Tentando som base64...');
            const fallbackAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            fallbackAudio.volume = 0.7;
            fallbackAudio.play().catch(fallbackError => {
              console.error('❌ Erro no som base64 também:', fallbackError);
            });
          });
      }
    } else {
      console.error('❌ Referência de áudio não encontrada');
    }
  };

  const getAlertStatus = () => {
    if (!isEnabled) return 'disabled';
    if (!maxSpread24h || maxSpread24h <= 0) return 'no-data';
    
    const threshold = maxSpread24h * 0.95;
    if (currentSpread >= threshold) return 'alerting';
    return 'waiting';
  };

  const alertStatus = getAlertStatus();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggle}
        className={`p-1 rounded transition-all duration-200 ${
          isEnabled 
            ? 'text-custom-cyan hover:text-custom-cyan/80' 
            : 'text-gray-500 hover:text-gray-400'
        }`}
        title={isEnabled ? 'Desativar alerta sonoro' : 'Ativar alerta sonoro'}
      >
        {isEnabled ? (
          <Volume2 className="h-4 w-4" />
        ) : (
          <VolumeX className="h-4 w-4" />
        )}
      </button>
      
      {/* Botão de teste de som */}
      {isEnabled && (
        <button
          onClick={testSound}
          className="p-1 text-yellow-400 hover:text-yellow-300 transition-colors"
          title="Testar som"
        >
          🔊
        </button>
      )}
      
      {isEnabled && maxSpread24h && maxSpread24h > 0 && (
        <div className="flex items-center gap-1">
          <Bell 
            className={`h-3 w-3 transition-all duration-200 ${
              alertStatus === 'alerting' 
                ? 'text-red-400 animate-pulse' 
                : alertStatus === 'waiting'
                ? 'text-yellow-400'
                : 'text-gray-500'
            }`} 
          />
          <span className={`text-xs transition-colors ${
            alertStatus === 'alerting' 
              ? 'text-red-400 font-bold' 
              : 'text-gray-400'
          }`}>
            {((currentSpread / maxSpread24h) * 100).toFixed(0)}%
          </span>
        </div>
      )}
      
      {/* Notificação visual quando alertando */}
      {isAlerting && (
        <div className="absolute inset-0 bg-red-500/20 border-2 border-red-400 rounded animate-pulse pointer-events-none" />
      )}
    </div>
  );
} 