"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = require("node-cron");
const client_1 = require("@prisma/client");
const gateio_connector_1 = require("./gateio-connector");
const mexc_connector_1 = require("./mexc-connector");
const fetch = require('node-fetch');
const { Pool } = require('pg');

const prisma = new client_1.PrismaClient();
let isCronRunning = false;

// Lista de pares a serem monitorados
const TRADING_PAIRS = [
    'BTC/USDT',
    'ETH/USDT',
    'SOL/USDT',
    'BNB/USDT',
    'XRP/USDT',
    'DOGE/USDT',
    'ADA/USDT',
    'AVAX/USDT',
    'MATIC/USDT',
    'DOT/USDT'
];

// Configuração do banco de dados
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Símbolos para monitorar
const SYMBOLS = {
  'BTC/USDT': {
    gateio: 'BTC_USDT',
    mexc: 'BTCUSDT'
  },
  'ETH/USDT': {
    gateio: 'ETH_USDT',
    mexc: 'ETHUSDT'
  },
  'SOL/USDT': {
    gateio: 'SOL_USDT',
    mexc: 'SOLUSDT'
  },
  'BNB/USDT': {
    gateio: 'BNB_USDT',
    mexc: 'BNBUSDT'
  },
  'XRP/USDT': {
    gateio: 'XRP_USDT',
    mexc: 'XRPUSDT'
  }
};

class SpreadMonitor {
    constructor() {
        this.lastSaveTime = null;
        this.priceData = new Map();
        this.spotPricesReceived = new Set();
        this.futuresPricesReceived = new Set();
        // Inicializa os conectores
        this.gateioConnector = new gateio_connector_1.GateIoConnector('GATEIO_SPOT', this.handlePriceUpdate.bind(this));
        this.mexcConnector = new mexc_connector_1.MexcConnector('MEXC_FUTURES', this.handlePriceUpdate.bind(this), () => { });
        console.log(`[${new Date().toISOString()}] SpreadMonitor inicializado`);
    }
    handlePriceUpdate(data) {
        const { symbol, marketType, bestBid, bestAsk } = data;
        
        // Log dos dados brutos recebidos
        console.log(`[${new Date().toISOString()}] Dados recebidos da exchange:`, {
            symbol,
            marketType,
            bestBid,
            bestAsk,
            rawData: JSON.stringify(data)
        });

        // Verifica se os preços são válidos
        if (!bestBid || !bestAsk || isNaN(bestBid) || isNaN(bestAsk)) {
            console.error(`[${new Date().toISOString()}] Preços inválidos recebidos para ${symbol} (${marketType}):`, {
                bestBid,
                bestAsk
            });
            return;
        }

        const averagePrice = (Number(bestBid) + Number(bestAsk)) / 2;

        console.log(`[${new Date().toISOString()}] Calculado preço médio para ${symbol} (${marketType}): ${averagePrice}`);

        if (marketType === 'spot') {
            this.spotPricesReceived.add(symbol);
            if (!this.priceData.has(symbol)) {
                this.priceData.set(symbol, { symbol, spotPrice: averagePrice, futuresPrice: 0 });
                console.log(`[${new Date().toISOString()}] Criado novo registro para ${symbol} com spotPrice=${averagePrice}`);
            } else {
                const data = this.priceData.get(symbol);
                data.spotPrice = averagePrice;
                console.log(`[${new Date().toISOString()}] Atualizado spotPrice para ${symbol}: ${averagePrice} (futuresPrice atual: ${data.futuresPrice})`);
            }
        } else if (marketType === 'futures') {
            this.futuresPricesReceived.add(symbol);
            if (!this.priceData.has(symbol)) {
                this.priceData.set(symbol, { symbol, spotPrice: 0, futuresPrice: averagePrice });
                console.log(`[${new Date().toISOString()}] Criado novo registro para ${symbol} com futuresPrice=${averagePrice}`);
            } else {
                const data = this.priceData.get(symbol);
                data.futuresPrice = averagePrice;
                console.log(`[${new Date().toISOString()}] Atualizado futuresPrice para ${symbol}: ${averagePrice} (spotPrice atual: ${data.spotPrice})`);
            }
        }

        // Log do estado atual do par após a atualização
        const currentData = this.priceData.get(symbol);
        if (currentData) {
            console.log(`[${new Date().toISOString()}] Estado atual de ${symbol}:`, {
                spotPrice: currentData.spotPrice,
                futuresPrice: currentData.futuresPrice,
                hasSpot: this.spotPricesReceived.has(symbol),
                hasFutures: this.futuresPricesReceived.has(symbol)
            });
        }
    }
    calculateSpread(spotPrice, futuresPrice) {
        return ((futuresPrice - spotPrice) / spotPrice) * 100;
    }
    async saveSpreadsToDatabase() {
        const timestamp = new Date();
        const spreads = [];
        console.log(`[${timestamp.toISOString()}] Preparando para salvar spreads no banco de dados`);
        console.log(`Pares spot recebidos: ${Array.from(this.spotPricesReceived).join(', ')}`);
        console.log(`Pares futures recebidos: ${Array.from(this.futuresPricesReceived).join(', ')}`);
        for (const [symbol, data] of this.priceData.entries()) {
            // Só salva se tiver ambos os preços
            if (data.spotPrice > 0 && data.futuresPrice > 0) {
                const spread = this.calculateSpread(data.spotPrice, data.futuresPrice);
                spreads.push({
                    symbol,
                    exchangeBuy: 'GATEIO',
                    exchangeSell: 'MEXC',
                    direction: 'SPOT_TO_FUTURES',
                    spread,
                    spotPrice: Number(data.spotPrice.toFixed(8)), // Garante que é um número com 8 casas decimais
                    futuresPrice: Number(data.futuresPrice.toFixed(8)), // Garante que é um número com 8 casas decimais
                    timestamp
                });
                console.log(`[${timestamp.toISOString()}] ${symbol}: Spot=${data.spotPrice.toFixed(8)}, Futures=${data.futuresPrice.toFixed(8)}, Spread=${spread.toFixed(4)}%`);
            } else {
                console.warn(`[${timestamp.toISOString()}] ${symbol}: Preços incompletos - Spot=${data.spotPrice}, Futures=${data.futuresPrice}`);
            }
        }
        if (spreads.length > 0) {
            try {
                await prisma.spreadHistory.createMany({
                    data: spreads
                });
                console.log(`[${timestamp.toISOString()}] Salvos ${spreads.length} spreads no banco de dados`);
                this.lastSaveTime = timestamp;
            }
            catch (error) {
                console.error('Erro ao salvar spreads:', error);
                console.error('Dados que tentamos salvar:', JSON.stringify(spreads, null, 2));
            }
        }
        else {
            console.warn(`[${timestamp.toISOString()}] Nenhum spread para salvar - Verifique se os preços estão sendo recebidos corretamente`);
        }
    }
    async monitorSpreads() {
        if (isCronRunning) {
            console.log('Monitoramento já está em execução');
            return;
        }
        try {
            isCronRunning = true;
            const startTime = new Date();
            console.log(`[${startTime.toISOString()}] Iniciando monitoramento de spreads...`);
            // Limpa os dados anteriores
            this.priceData.clear();
            this.spotPricesReceived.clear();
            this.futuresPricesReceived.clear();
            // Conecta às exchanges
            this.gateioConnector.connect(TRADING_PAIRS);
            this.mexcConnector.connect();
            this.mexcConnector.subscribe(TRADING_PAIRS);
            // Aguarda 10 segundos para receber os preços
            console.log(`[${new Date().toISOString()}] Aguardando 10 segundos para receber preços...`);
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Salva os spreads no banco de dados
            await this.saveSpreadsToDatabase();
            const endTime = new Date();
            const duration = (endTime.getTime() - startTime.getTime()) / 1000;
            console.log(`[${endTime.toISOString()}] Monitoramento concluído em ${duration} segundos`);
        }
        catch (error) {
            console.error('Erro durante o monitoramento:', error);
        }
        finally {
            isCronRunning = false;
        }
    }
    getLastSaveTime() {
        return this.lastSaveTime;
    }
}

// Cria e inicia o monitor
const spreadMonitor = new SpreadMonitor();

// Agenda a execução a cada 30 minutos
node_cron_1.schedule('*/30 * * * *', async () => {
    const now = new Date();
    const lastSave = spreadMonitor.getLastSaveTime();
    const timeSinceLastSave = lastSave ? (now.getTime() - lastSave.getTime()) / 1000 : null;
    console.log(`[${now.toISOString()}] Executando monitoramento agendado`);
    if (lastSave) {
        console.log(`Último salvamento: ${lastSave.toISOString()} (${timeSinceLastSave}s atrás)`);
    }
    await spreadMonitor.monitorSpreads();
});

// Executa imediatamente ao iniciar
console.log(`[${new Date().toISOString()}] Iniciando serviço de monitoramento`);
spreadMonitor.monitorSpreads().catch(console.error);

// Tratamento de encerramento gracioso
process.on('SIGTERM', async () => {
    console.log('Recebido sinal SIGTERM. Encerrando...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Recebido sinal SIGINT. Encerrando...');
    await prisma.$disconnect();
    process.exit(0);
});

// Função para obter preço do Gate.io
async function getGateioPrice(symbol) {
  try {
    const response = await fetch(`https://api.gateio.ws/api/v4/spot/tickers?currency_pair=${symbol}`);
    const data = await response.json();
    const ticker = data[0];
    
    if (!ticker) {
      throw new Error(`No ticker data for ${symbol}`);
    }

    const buy = Number(ticker.highest_bid);
    const sell = Number(ticker.lowest_ask);
    return (buy + sell) / 2;
  } catch (error) {
    console.error(`Error fetching Gate.io price for ${symbol}:`, error);
    return 0;
  }
}

// Função para obter preço do MEXC
async function getMexcPrice(symbol) {
  try {
    const response = await fetch(`https://api.mexc.com/api/v3/ticker/24hr?symbol=${symbol}`);
    const ticker = await response.json();
    
    const buy = Number(ticker.bidPrice);
    const sell = Number(ticker.askPrice);
    return (buy + sell) / 2;
  } catch (error) {
    console.error(`Error fetching MEXC price for ${symbol}:`, error);
    return 0;
  }
}

// Função para salvar spread no banco
async function saveSpread(data) {
  const query = `
    INSERT INTO "Spread" (symbol, "gateioPrice", "mexcPrice", "spreadPercentage", timestamp)
    VALUES ($1, $2, $3, $4, $5)
  `;
  
  const values = [
    data.symbol,
    data.gateioPrice,
    data.mexcPrice,
    data.spreadPercentage,
    data.timestamp
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error('Error saving spread:', error);
  }
}

// Função para limpar spreads antigos
async function cleanOldSpreads(days) {
  const query = `
    DELETE FROM "Spread"
    WHERE timestamp < NOW() - INTERVAL '${days} days'
  `;
  
  try {
    await pool.query(query);
  } catch (error) {
    console.error('Error cleaning old spreads:', error);
  }
}

// Função principal de monitoramento
async function monitorSpread() {
  try {
    for (const [baseSymbol, exchangeSymbols] of Object.entries(SYMBOLS)) {
      try {
        const [gateioPrice, mexcPrice] = await Promise.all([
          getGateioPrice(exchangeSymbols.gateio),
          getMexcPrice(exchangeSymbols.mexc)
        ]);

        if (!gateioPrice || !mexcPrice) {
          console.log(`Preço não disponível para ${baseSymbol}`);
          continue;
        }

        const spreadPercentage = calculateSpread(gateioPrice, mexcPrice);

        await saveSpread({
          symbol: baseSymbol,
          gateioPrice,
          mexcPrice,
          spreadPercentage,
          timestamp: new Date()
        });

        console.log(`${baseSymbol}: Gate.io: ${gateioPrice}, MEXC: ${mexcPrice}, Spread: ${spreadPercentage}%`);
      } catch (error) {
        console.error(`Erro ao processar ${baseSymbol}:`, error);
      }
    }

    // Limpa spreads antigos (mantém 7 dias)
    await cleanOldSpreads(7);
  } catch (error) {
    console.error('Erro no monitoramento:', error);
  }
}

// Executa a cada 5 minutos
setInterval(monitorSpread, 5 * 60 * 1000);

// Primeira execução
monitorSpread(); 