"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MexcConnector = void 0;
const ws_1 = __importDefault(require("ws"));
const events_1 = require("events");
const MEXC_SPOT_WS_URL = 'wss://wbs.mexc.com/ws';
class MexcConnector extends events_1.EventEmitter {
    constructor(identifier, onPriceUpdate, onConnect) {
        super();
        this.ws = null;
        this.isConnected = false;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 3000;
        this.subscriptions = new Set();
        this.pingInterval = null;
        this.pingTimeout = null;
        this.pendingSubscriptions = [];
        this.lastPingTime = 0;
        this.marketIdentifier = identifier;
        this.onPriceUpdate = onPriceUpdate;
        this.onConnectedCallback = onConnect;
        if (process && typeof process.on === 'function') {
            process.on('SIGINT', () => {
                console.log(`[${this.marketIdentifier}] Recebido SIGINT, desconectando...`);
                this.disconnect();
                process.exit(0);
            });
        }
        console.log(`[${this.marketIdentifier}] Conector instanciado.`);
    }
    connect() {
        if (this.isConnecting) {
            console.log(`[${this.marketIdentifier}] Conexão já em andamento.`);
            return;
        }
        if (this.ws) {
            console.log(`[${this.marketIdentifier}] Fechando conexão existente...`);
            this.ws.terminate();
            this.ws = null;
        }
        this.isConnecting = true;
        console.log(`[${this.marketIdentifier}] Conectando a ${MEXC_SPOT_WS_URL}`);
        try {
            this.ws = new ws_1.default(MEXC_SPOT_WS_URL);
            if (!this.ws) {
                throw new Error('Falha ao criar WebSocket');
            }
            const connectionTimeout = setTimeout(() => {
                if (!this.isConnected) {
                    console.log(`[${this.marketIdentifier}] Timeout na conexão inicial`);
                    this.handleDisconnect();
                }
            }, 30000);
            this.ws.on('open', () => {
                clearTimeout(connectionTimeout);
                console.log(`[${this.marketIdentifier}] Conexão WebSocket estabelecida.`);
                this.isConnected = true;
                this.isConnecting = false;
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                if (this.pendingSubscriptions.length > 0) {
                    console.log(`[${this.marketIdentifier}] Processando ${this.pendingSubscriptions.length} subscrições pendentes...`);
                    setTimeout(() => {
                        this.sendSubscriptionRequests(this.pendingSubscriptions);
                        this.pendingSubscriptions = [];
                    }, 1000);
                }
                if (this.onConnectedCallback) {
                    this.onConnectedCallback();
                }
            });
            this.ws.on('pong', () => {
                this.lastPingTime = Date.now();
                if (this.pingTimeout) {
                    clearTimeout(this.pingTimeout);
                    this.pingTimeout = null;
                }
                console.log(`[${this.marketIdentifier}] Pong recebido`);
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.lastPingTime = Date.now();
                    if (message.c === 'spot.ticker') {
                        const ticker = message.d;
                        const pair = ticker.s.replace('_', '/').toUpperCase();
                        const priceData = {
                            bestAsk: parseFloat(ticker.a),
                            bestBid: parseFloat(ticker.b),
                        };
                        if (!priceData.bestAsk || !priceData.bestBid) {
                            console.log(`[${this.marketIdentifier}] Preços inválidos recebidos:`, ticker);
                            return;
                        }
                        this.onPriceUpdate({
                            type: 'price-update',
                            symbol: pair,
                            marketType: 'spot',
                            bestAsk: priceData.bestAsk,
                            bestBid: priceData.bestBid,
                            identifier: this.marketIdentifier
                        });
                    }
                    else if (message.code !== undefined) {
                        console.log(`[${this.marketIdentifier}] Resposta da API:`, message);
                        if (message.code !== 0) {
                            console.error(`[${this.marketIdentifier}] Erro na resposta:`, message);
                        }
                    }
                }
                catch (error) {
                    console.error(`[${this.marketIdentifier}] Erro ao processar mensagem:`, error);
                }
            });
            this.ws.on('close', (code, reason) => {
                clearTimeout(connectionTimeout);
                console.log(`[${this.marketIdentifier}] Conexão fechada. Código: ${code}, Razão: ${reason || 'Não especificada'}`);
                this.handleDisconnect();
            });
            this.ws.on('error', (error) => {
                clearTimeout(connectionTimeout);
                console.error(`[${this.marketIdentifier}] Erro na conexão:`, error);
                this.handleDisconnect();
            });
        }
        catch (error) {
            console.error(`[${this.marketIdentifier}] Erro ao criar WebSocket:`, error);
            this.handleDisconnect();
        }
    }
    startHeartbeat() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            var _a;
            if (this.isConnected && ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === 1) {
                try {
                    const pingMsg = { method: "ping" };
                    console.log(`[${this.marketIdentifier}] Enviando ping`);
                    this.ws.ping();
                    if (this.pingTimeout) {
                        clearTimeout(this.pingTimeout);
                    }
                    this.pingTimeout = setTimeout(() => {
                        console.error(`[${this.marketIdentifier}] Timeout no ping`);
                        this.handleDisconnect();
                    }, 5000);
                    this.ws.send(JSON.stringify(pingMsg));
                }
                catch (error) {
                    console.error(`[${this.marketIdentifier}] Erro ao enviar ping:`, error);
                    this.handleDisconnect();
                }
            }
        }, 15000);
    }
    handleDisconnect() {
        this.isConnected = false;
        this.isConnecting = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }
        if (this.ws) {
            try {
                this.ws.terminate();
            }
            catch (error) {
                console.error(`[${this.marketIdentifier}] Erro ao terminar WebSocket:`, error);
            }
            this.ws = null;
        }
        this.pendingSubscriptions = Array.from(this.subscriptions);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);
            console.log(`[${this.marketIdentifier}] Tentando reconectar em ${delay}ms... (Tentativa ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            setTimeout(() => this.connect(), delay);
        }
        else {
            console.error(`[${this.marketIdentifier}] Máximo de tentativas de reconexão atingido. Reiniciando contador...`);
            this.reconnectAttempts = 0;
            setTimeout(() => this.connect(), this.reconnectDelay);
        }
    }
    subscribe(symbols) {
        var _a;
        console.log(`[${this.marketIdentifier}] Inscrevendo nos símbolos:`, symbols);
        symbols.forEach(symbol => this.subscriptions.add(symbol));
        if (this.isConnected && ((_a = this.ws) === null || _a === void 0 ? void 0 : _a.readyState) === 1) {
            setTimeout(() => {
                this.sendSubscriptionRequests(Array.from(this.subscriptions));
            }, 1000);
        }
        else {
            console.log(`[${this.marketIdentifier}] WebSocket não está pronto. Adicionando à fila de subscrições pendentes.`);
            this.pendingSubscriptions = Array.from(this.subscriptions);
            if (!this.isConnecting) {
                this.connect();
            }
        }
    }
    sendSubscriptionRequests(symbols) {
        if (!this.ws || this.ws.readyState !== 1) {
            console.log(`[${this.marketIdentifier}] WebSocket não está pronto para subscrição`);
            this.pendingSubscriptions = symbols;
            return;
        }
        symbols.forEach((symbol, index) => {
            setTimeout(() => {
                if (!this.ws || this.ws.readyState !== 1)
                    return;
                const formattedSymbol = symbol.replace('/', '').toLowerCase();
                const msg = {
                    method: 'sub.ticker',
                    param: {
                        symbol: formattedSymbol
                    },
                    id: Date.now()
                };
                try {
                    console.log(`[${this.marketIdentifier}] Enviando subscrição:`, JSON.stringify(msg));
                    this.ws.send(JSON.stringify(msg));
                }
                catch (error) {
                    console.error(`[${this.marketIdentifier}] Erro ao enviar subscrição para ${symbol}:`, error);
                    this.pendingSubscriptions.push(symbol);
                }
            }, index * 100);
        });
    }
    disconnect() {
        console.log(`[${this.marketIdentifier}] Desconectando...`);
        this.isConnected = false;
        this.isConnecting = false;
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.pingTimeout) {
            clearTimeout(this.pingTimeout);
            this.pingTimeout = null;
        }
        if (this.ws) {
            try {
                this.ws.terminate();
                this.ws = null;
            }
            catch (error) {
                console.error(`[${this.marketIdentifier}] Erro ao fechar WebSocket:`, error);
            }
        }
    }
    async getTradablePairs() {
        return [
            'BTC/USDT',
            'ETH/USDT',
            'SOL/USDT',
            'XRP/USDT',
            'BNB/USDT'
        ];
    }
}
exports.MexcConnector = MexcConnector;
//# sourceMappingURL=mexc-connector.js.map