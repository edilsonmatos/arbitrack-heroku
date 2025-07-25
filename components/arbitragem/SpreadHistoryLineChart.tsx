'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SpreadHistoryData {
  timestamp: string;
  spread_percentage: number;
}

interface SpreadHistoryLineChartProps {
  symbol: string;
  isOpen: boolean;
  onClose: () => void;
}

type CustomTooltipProps = {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
};

function getBrasiliaDate(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function formatBrasiliaTime(date: Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Função utilitária para converter timestamp para horário de Brasília no formato DD/MM - HH:mm
function toBrasiliaLabel(timestamp: string) {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).replace(', ', ' - ');
}

export default function SpreadHistoryLineChart({ symbol, isOpen, onClose }: SpreadHistoryLineChartProps) {
  const [data, setData] = useState<SpreadHistoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!isOpen) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/spread-history/24h/${encodeURIComponent(symbol)}`);
      if (!response.ok) throw new Error('Falha ao carregar dados');
      const result = await response.json();
      setData(result);
      setError(null);
      setLastUpdate(new Date());
      console.log('Dados atualizados:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
    } catch (err) {
      console.error('Erro ao buscar histórico:', err);
      setError('Falha ao carregar dados do histórico');
    } finally {
      setLoading(false);
    }
  }, [symbol, isOpen]);

  // Atualiza os dados quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Configura atualização a cada 1 minuto
  useEffect(() => {
    if (!isOpen) return;

    // Atualiza imediatamente
    fetchData();

    // Configura atualizações a cada 30 minutos (otimizado para economia)
    const interval = setInterval(fetchData, 30 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, fetchData]);

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="bg-gray-800 border border-gray-700 p-2 rounded-md shadow-lg">
          <p className="text-white">{`Data: ${label}`}</p>
          <p className="text-purple-400">{`Spread: ${payload[0].value.toFixed(2)}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl bg-dark-card border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            Histórico de Spreads - {symbol}
            {lastUpdate && (
              <span className="text-sm text-gray-400 ml-2">
                (Atualizado: {formatBrasiliaTime(lastUpdate)})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="h-[400px] w-full mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Carregando dados...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-400">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Nenhum dado disponível</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => value}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                  domain={['dataMin', 'dataMax']}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  labelFormatter={(label) => label}
                />
                <Line
                  type="linear"
                  dataKey="spread_percentage"
                  stroke="#A855F7"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#A855F7' }}
                  activeDot={{ r: 6 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 