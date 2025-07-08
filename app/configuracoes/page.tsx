"use client";

import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, Key, Shield, AlertTriangle, CheckCircle, ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import Link from 'next/link';

interface ApiConfig {
  id: string;
  exchange: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  source?: 'database' | 'environment';
}

interface ExchangeForm {
  exchange: string;
  apiKey: string;
  apiSecret: string;
  passphrase?: string;
  showApiKey: boolean;
  showApiSecret: boolean;
  showPassphrase?: boolean;
  isActive: boolean;
}

const EXCHANGES = [
  { value: 'gateio', label: 'Gate.io', instructions: 'Acesse sua conta Gate.io → API Management → Create API Key' },
  { value: 'mexc', label: 'MEXC', instructions: 'Acesse sua conta MEXC → API Management → Create API Key' },
  { value: 'binance', label: 'Binance', instructions: 'Acesse sua conta Binance → API Management → Create API Key' },
  { value: 'bybit', label: 'Bybit', instructions: 'Acesse sua conta Bybit → API → Create New Key' },
  { value: 'bitget', label: 'Bitget', instructions: 'Acesse sua conta Bitget → API Management → Create API Key (Passphrase obrigatória)', needsPassphrase: true }
];

export default function ConfiguracoesPage() {
  const [configs, setConfigs] = useState<ApiConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  // Estado do formulário
  const [form, setForm] = useState<ExchangeForm>({
    exchange: '',
    apiKey: '',
    apiSecret: '',
    passphrase: '',
    showApiKey: false,
    showApiSecret: false,
    showPassphrase: false,
    isActive: true
  });

  // Carregar configurações existentes
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/config/api-keys');
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      } else {
        console.error('Erro ao carregar configurações:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const resetForm = () => {
    setForm({
      exchange: '',
      apiKey: '',
      apiSecret: '',
      passphrase: '',
      showApiKey: false,
      showApiSecret: false,
      showPassphrase: false,
      isActive: true
    });
  };

  const handleSaveConfig = async () => {
    if (!form.exchange || !form.apiKey || !form.apiSecret) {
      showMessage('error', 'Exchange, API Key e API Secret são obrigatórios.');
      return;
    }

    const selectedExchange = EXCHANGES.find(ex => ex.value === form.exchange);
    if (selectedExchange?.needsPassphrase && !form.passphrase) {
      showMessage('error', 'Passphrase é obrigatória para Bitget.');
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        exchange: form.exchange,
        apiKey: form.apiKey,
        apiSecret: form.apiSecret,
        ...(form.passphrase && { passphrase: form.passphrase }),
        isActive: form.isActive
      };

      const response = await fetch('/api/config/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        showMessage('success', `Configuração ${form.exchange.toUpperCase()} salva com sucesso!`);
        loadConfigs();
        resetForm();
        setShowForm(false);
      } else {
        const errorData = await response.json();
        showMessage('error', errorData.error || 'Erro ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      showMessage('error', 'Erro de conexão ao salvar configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfig = async (exchange: string) => {
    if (!confirm(`Tem certeza que deseja remover a configuração da ${exchange.toUpperCase()}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/config/api-keys?exchange=${exchange}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showMessage('success', `Configuração ${exchange.toUpperCase()} removida com sucesso!`);
        loadConfigs();
      } else {
        const errorData = await response.json();
        showMessage('error', errorData.error || 'Erro ao remover configuração');
      }
    } catch (error) {
      console.error('Erro ao remover configuração:', error);
      showMessage('error', 'Erro de conexão ao remover configuração');
    } finally {
      setIsLoading(false);
    }
  };

  const getExchangeLabel = (exchange: string) => {
    return EXCHANGES.find(ex => ex.value === exchange)?.label || exchange;
  };

  const getExchangeInstructions = (exchange: string) => {
    return EXCHANGES.find(ex => ex.value === exchange)?.instructions || '';
  };

  const needsPassphrase = (exchange: string) => {
    return EXCHANGES.find(ex => ex.value === exchange)?.needsPassphrase || false;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header com botão de voltar */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              Voltar ao Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Configurações de API</h1>
          <p className="text-gray-400">
            Configure suas chaves de API das exchanges de forma segura. As chaves são criptografadas antes do armazenamento.
          </p>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-900/20 border border-green-500/30 text-green-400' : 'bg-red-900/20 border border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        {/* Botão para adicionar nova configuração */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-custom-cyan hover:bg-custom-cyan/80 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Cancelar' : 'Adicionar Nova Configuração'}
          </button>
        </div>

        {/* Formulário de adição */}
        {showForm && (
          <div className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Key className="h-5 w-5 text-custom-cyan" />
              Nova Configuração de API
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção da Exchange */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Exchange *
                </label>
                <select
                  value={form.exchange}
                  onChange={(e) => setForm({...form, exchange: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-custom-cyan focus:border-transparent"
                >
                  <option value="">Selecione uma exchange</option>
                  {EXCHANGES.map(exchange => (
                    <option key={exchange.value} value={exchange.value}>
                      {exchange.label}
                    </option>
                  ))}
                </select>
                {form.exchange && (
                  <p className="text-xs text-gray-400 mt-1">
                    {getExchangeInstructions(form.exchange)}
                  </p>
                )}
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={form.showApiKey ? "text" : "password"}
                    value={form.apiKey}
                    onChange={(e) => setForm({...form, apiKey: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-custom-cyan focus:border-transparent"
                    placeholder="Sua API Key"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({...form, showApiKey: !form.showApiKey})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {form.showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* API Secret */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  API Secret *
                </label>
                <div className="relative">
                  <input
                    type={form.showApiSecret ? "text" : "password"}
                    value={form.apiSecret}
                    onChange={(e) => setForm({...form, apiSecret: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-custom-cyan focus:border-transparent"
                    placeholder="Sua API Secret"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({...form, showApiSecret: !form.showApiSecret})}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {form.showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Passphrase (apenas para Bitget) */}
              {needsPassphrase(form.exchange) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Passphrase *
                  </label>
                  <div className="relative">
                    <input
                      type={form.showPassphrase ? "text" : "password"}
                      value={form.passphrase || ''}
                      onChange={(e) => setForm({...form, passphrase: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-custom-cyan focus:border-transparent"
                      placeholder="Sua Passphrase"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({...form, showPassphrase: !form.showPassphrase})}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                      {form.showPassphrase ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Checkbox Ativa */}
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="is-active"
                checked={form.isActive}
                onChange={(e) => setForm({...form, isActive: e.target.checked})}
                className="h-4 w-4 text-custom-cyan focus:ring-custom-cyan border-gray-600 rounded bg-gray-700"
              />
              <label htmlFor="is-active" className="ml-2 text-sm text-gray-300">
                Configuração ativa
              </label>
            </div>

            {/* Botão Salvar */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveConfig}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-custom-cyan hover:bg-custom-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Salvando...' : 'Salvar Configuração'}
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista das configurações existentes */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Key className="h-5 w-5 text-custom-cyan" />
              Configurações Existentes
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              {configs.length} configuração{configs.length !== 1 ? 'ões' : ''} configurada{configs.length !== 1 ? 's' : ''}
            </p>
          </div>

          {configs.length === 0 ? (
            <div className="p-8 text-center">
              <Key className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">Nenhuma configuração encontrada</p>
              <p className="text-sm text-gray-500">Adicione sua primeira configuração de API clicando no botão acima</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {configs.map((config) => (
                <div key={config.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-medium text-white">
                        {getExchangeLabel(config.exchange)}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        config.isActive 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {config.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                      {config.source === 'environment' && (
                        <span className="px-2 py-1 rounded-full text-xs bg-blue-600 text-white">
                          Variável de Ambiente
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      <p>Configurada em: {new Date(config.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p>Última atualização: {new Date(config.updatedAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {config.source === 'environment' ? (
                      <span className="text-xs text-gray-500 px-2 py-1">
                        Não pode ser removida
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDeleteConfig(config.exchange)}
                        disabled={isLoading}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                        title="Remover configuração"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Aviso de segurança */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span className="text-blue-400 font-medium">Segurança</span>
          </div>
          <p className="text-blue-300 text-sm">
            Suas chaves de API são criptografadas antes de serem armazenadas no banco de dados. 
            Nunca compartilhe suas chaves de API com terceiros.
          </p>
        </div>
      </div>
    </div>
  );
} 