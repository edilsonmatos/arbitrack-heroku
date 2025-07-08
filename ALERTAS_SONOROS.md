# Sistema de Alertas Sonoros

## Visão Geral

O sistema de alertas sonoros foi implementado para notificar quando o spread atual de uma oportunidade de arbitragem representa 95% ou mais do spread máximo das últimas 24 horas. Isso permite identificar momentos ótimos para execução de operações.

## Funcionalidades

### 1. Alerta Individual por Símbolo
- **Localização**: Ao lado de cada oportunidade na tabela de arbitragem
- **Controle**: Botão de ativar/desativar (ícone de volume)
- **Indicador Visual**: 
  - Ícone de sino que muda de cor conforme o status
  - Porcentagem atual em relação ao máximo das 24h
  - Animação pulsante quando alertando

### 2. Controle Global
- **Localização**: Dashboard principal
- **Funcionalidades**:
  - Ativar/desativar todos os alertas
  - Visualizar status de todos os símbolos monitorados
  - Contador de alertas ativos

### 3. Notificações
- **Som**: Beep duplo audível
- **Toast**: Notificação visual no canto superior direito
- **Cooldown**: 30 segundos entre alertas para evitar spam

## Como Usar

### Ativar Alerta para um Símbolo
1. Na tabela de oportunidades de arbitragem
2. Localize o ícone de volume ao lado do spread máximo
3. Clique para ativar (ícone ficará azul)
4. O alerta será disparado quando o spread atingir 95% do máximo

### Gerenciar Alertas Globais
1. No dashboard, vá para a seção "Alertas Sonoros"
2. Use "Ativar Todos" ou "Desativar Todos" para controle em massa
3. Clique no ícone de configurações para ver detalhes dos símbolos

## Configuração Técnica

### Componentes Principais
- `SoundAlert.tsx`: Componente individual de alerta
- `useSoundAlerts.ts`: Hook para gerenciar configurações
- `SoundAlertControls.tsx`: Controle global
- `ToastProvider.tsx`: Sistema de notificações

### Persistência
- Configurações salvas no localStorage
- Símbolos adicionados automaticamente quando dados estão disponíveis
- Configurações mantidas entre sessões

### Critérios de Alerta
- Spread atual ≥ 95% do spread máximo das últimas 24h
- Alerta ativo para o símbolo específico
- Cooldown de 30 segundos respeitado
- Dados históricos suficientes (mínimo 2 registros)

## Personalização

### Som do Alerta
O som pode ser personalizado modificando o `audioRef.src` no componente `SoundAlert.tsx`:

```typescript
audioRef.current.src = 'URL_DO_SEU_SOM';
```

### Volume
Ajuste o volume modificando:

```typescript
audioRef.current.volume = 0.7; // 0.0 a 1.0
```

### Threshold
Para alterar o percentual de 95%, modifique:

```typescript
const threshold = maxSpread24h * 0.95; // Mude para 0.90 para 90%
```

### Cooldown
Para alterar o tempo entre alertas:

```typescript
const alertCooldownRef = useRef<number>(30000); // 30 segundos
```

## Troubleshooting

### Alerta não toca
1. Verifique se o navegador permite reprodução de áudio
2. Confirme se o alerta está ativo para o símbolo
3. Verifique se há dados históricos suficientes

### Configurações não salvam
1. Verifique se o localStorage está habilitado
2. Limpe o cache do navegador se necessário

### Performance
- Cache de 5 minutos para dados de spread máximo
- Cooldown de 30 segundos evita spam
- Componentes otimizados com React.memo 