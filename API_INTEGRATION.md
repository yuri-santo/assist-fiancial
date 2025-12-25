# Guia de Integração de APIs - FinControl

## Sistema Unificado de Cotações

### Visão Geral

O sistema agora usa uma arquitetura unificada com fallback automático entre múltiplas APIs:

1. **Yahoo Finance** (Prioridade 1 - Gratuito, sem API key)
2. **Brapi** (Prioridade 2 - Com token para melhor performance)
3. **CoinGecko** (Para criptomoedas quando Brapi falha)
4. **Alpha Vantage** (Fallback para stocks dos EUA)

```typescript
import { getUnifiedQuote } from "@/lib/api/unified-quote-service"

// Busca automática com fallback
const quote = await getUnifiedQuote("PETR4", "stock", "BRL")
console.log(`Preço: ${quote.price} (Fonte: ${quote.source})`)
```

### Unified Quote Service

#### Buscar Cotação com Fallback Automático

```typescript
import { getUnifiedQuote, getHistoricalPrice } from "@/lib/api/unified-quote-service"

// Cotação atual
const quote = await getUnifiedQuote(
  "BTC",           // ticker
  "crypto",        // tipo: "stock" | "crypto"
  "BRL"            // moeda
)

// Cotação histórica
const historicalPrice = await getHistoricalPrice(
  "PETR4",         // ticker
  "2024-01-15",    // data
  "stock",         // tipo
  "BRL"            // moeda
)
```

#### Resposta Unificada

```typescript
interface UnifiedQuote {
  symbol: string           // Ticker/símbolo
  name: string            // Nome do ativo
  price: number           // Preço atual
  change: number          // Variação em valor absoluto
  changePercent: number   // Variação percentual
  currency: string        // Moeda (BRL, USD)
  source: "yahoo" | "brapi" | "coingecko" | "alphavantage" | "fallback"
}
```

## Brapi API

### Autenticação

Todas as requisições devem incluir o token no header:

```typescript
headers: {
  Authorization: `Bearer ${process.env.BRAPI_TOKEN}`,
  Accept: "application/json"
}
```

### Endpoints Disponíveis

#### 1. Cotações de Ações (`/api/quote/{tickers}`)

```typescript
// Cotação única
GET https://brapi.dev/api/quote/PETR4?fundamental=false

// Múltiplas cotações
GET https://brapi.dev/api/quote/PETR4,VALE3,ITUB4?fundamental=false

// Resposta
{
  "results": [
    {
      "symbol": "PETR4",
      "shortName": "PETROBRAS",
      "regularMarketPrice": 38.50,
      "regularMarketChange": 0.75,
      "regularMarketChangePercent": 1.98,
      "regularMarketDayHigh": 39.20,
      "regularMarketDayLow": 37.80,
      ...
    }
  ]
}
```

#### 2. Lista de Ativos (`/api/quote/list`)

```typescript
GET https://brapi.dev/api/quote/list?sortBy=name&type=stock&sector=Financeiro

// Filtros disponíveis
- search: Busca por nome ou ticker
- sortBy: name, close, change, volume
- sortOrder: asc, desc
- limit: Limite de resultados
- page: Paginação
- type: stock, fund (FII)
- sector: Setor econômico
```

#### 3. Ativos Disponíveis (`/api/available`)

```typescript
GET https://brapi.dev/api/available?search=PETR

// Resposta
{
  "stocks": ["PETR3", "PETR4"]
}
```

#### 4. Criptomoedas (`/api/v2/crypto`)

```typescript
GET https://brapi.dev/api/v2/crypto?coin=BTC&currency=BRL

// Resposta
{
  "coins": [
    {
      "coin": "BTC",
      "currency": "BRL",
      "currencyRateFromUSD": 5.40,
      "coinName": "Bitcoin",
      "regularMarketPrice": 540000.00,
      "regularMarketChange": 5000.00,
      "regularMarketChangePercent": 0.93,
      "regularMarketDayHigh": 545000.00,
      "regularMarketDayLow": 535000.00,
      "circulatingSupply": 19500000,
      "marketCap": 10530000000000
    }
  ]
}
```

#### 5. Criptomoedas Disponíveis (`/api/v2/crypto/available`)

```typescript
GET https://brapi.dev/api/v2/crypto/available

// Resposta
{
  "coins": ["BTC", "ETH", "BNB", "XRP", ...]
}
```

### Implementação Recomendada

#### Service Layer com Fallbacks

```typescript
// lib/api/unified-quote-service.ts
export async function getUnifiedQuote(
  ticker: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL"
): Promise<UnifiedQuote | null> {
  
  // Para criptomoedas: Brapi -> CoinGecko
  if (assetType === "crypto") {
    const brapiQuote = await getCryptoCotacao(ticker, currency)
    if (brapiQuote) return convertToBrapiFormat(brapiQuote)
    
    const geckoQuote = await fetchFromCoinGecko(ticker, currency)
    if (geckoQuote) return geckoQuote
    
    return null
  }
  
  // Para ações: Yahoo -> Brapi -> Alpha Vantage
  const brapiQuote = await getBrapiCotacao(ticker)
  if (brapiQuote) return convertToBrapiFormat(brapiQuote)
  
  const alphaQuote = await fetchFromAlphaVantage(ticker)
  if (alphaQuote) return alphaQuote
  
  return null
}
```

#### Busca de Preço Histórico

```typescript
export async function getHistoricalPrice(
  ticker: string,
  date: string,
  assetType: "stock" | "crypto",
  currency: "BRL" | "USD" = "BRL"
): Promise<number | null> {
  
  // Tenta preço histórico
  if (assetType === "crypto") {
    const cryptoPrice = await getCryptoHistorica(ticker, date, currency)
    if (cryptoPrice) return cryptoPrice
  } else {
    const stockPrice = await getBrapiHistorica(ticker, date)
    if (stockPrice) return stockPrice
  }
  
  // Fallback: usa preço atual se histórico não disponível
  const currentQuote = await getUnifiedQuote(ticker, assetType, currency)
  if (currentQuote) {
    console.log("[v0] Using current price as fallback")
    return currentQuote.price
  }
  
  return null
}
```

#### Cache Local

```sql
-- Tabela para cache de cotações
CREATE TABLE cotacoes_historico (
  ticker TEXT,
  preco DECIMAL(12,2),
  variacao DECIMAL(8,4),
  data DATE,
  UNIQUE(ticker, data)
);

-- Estratégia: Buscar cache se < 15 minutos, senão API
```

### Rate Limiting e Boas Práticas

1. **Requisições Sequenciais**: Processar um ticker por vez para evitar 429
2. **Delay Entre Chamadas**: 300ms entre requisições múltiplas
3. **Debounce**: 500ms de delay em buscas de usuário
4. **Cache**: Armazenar cotações por 15 minutos
5. **Timeout**: 5-8 segundos máximo por requisição
6. **Fallback Automático**: Tentar múltiplas APIs sequencialmente
7. **Error Handling**: Logs detalhados com `[v0]` prefix
8. **Retry Logic**: Não repetir requisições falhas imediatamente

### Exemplos de Uso

#### Buscar Ação Brasileira

```typescript
import { getUnifiedQuote } from "@/lib/api/unified-quote-service"

const quote = await getUnifiedQuote("PETR4", "stock", "BRL")
if (quote) {
  console.log(`${quote.name}: R$ ${quote.price}`)
  console.log(`Variação: ${quote.changePercent}%`)
  console.log(`Fonte: ${quote.source}`)
}
```

#### Buscar Stock dos EUA

```typescript
const quote = await getUnifiedQuote("AAPL", "stock", "USD")
if (quote) {
  console.log(`Apple: $${quote.price} (${quote.source})`)
}
```

#### Buscar Criptomoeda

```typescript
const crypto = await getUnifiedQuote("BTC", "crypto", "BRL")
if (crypto) {
  console.log(`Bitcoin: R$ ${crypto.price.toFixed(2)}`)
  console.log(`API usada: ${crypto.source}`)
}
```

#### Buscar Preço Histórico

```typescript
import { getHistoricalPrice } from "@/lib/api/unified-quote-service"

const price = await getHistoricalPrice(
  "VALE3", 
  "2024-01-15", 
  "stock", 
  "BRL"
)

if (price) {
  console.log(`VALE3 em 15/01/2024: R$ ${price}`)
} else {
  console.log("Preço histórico não disponível")
}
```

#### Buscar Múltiplas Cotações (Sequencial)

```typescript
const tickers = ["PETR4", "VALE3", "ITUB4"]
const quotes = []

for (const ticker of tickers) {
  const quote = await getUnifiedQuote(ticker, "stock", "BRL")
  if (quote) quotes.push(quote)
  
  // Delay para evitar rate limiting
  await new Promise(resolve => setTimeout(resolve, 300))
}

console.log(`Obtidas ${quotes.length} de ${tickers.length} cotações`)
```

### Tratamento de Erros

```typescript
try {
  const quote = await getUnifiedQuote(ticker, "stock", "BRL")
  
  if (!quote) {
    // Nenhuma API conseguiu retornar dados
    setError("Ativo não encontrado em nenhuma fonte. Verifique o ticker.")
  } else {
    // Sucesso
    setCotacao(quote.price)
    
    // Avisar se usou fallback
    if (quote.source !== "yahoo" && quote.source !== "brapi") {
      setWarning(`Cotação obtida via ${quote.source} (API alternativa)`)
    }
  }
} catch (error) {
  // Erro de rede ou timeout
  console.error("[v0] API Error:", error)
  setError("Erro de conexão. Verifique sua internet e tente novamente.")
}
```

### Debugging

```typescript
// Os serviços já incluem logs automáticos com [v0] prefix:

console.log("[v0] Fetching unified quote for PETR4 (stock)")
console.log("[v0] Trying Yahoo Finance for PETR4")
console.log("[v0] Got quote from Yahoo Finance for PETR4")
console.log("[v0] Using current price as fallback: 38.50")
console.log("[v0] Quote from brapi: 38.50")
```

## APIs Individuais

### Yahoo Finance (Prioridade 1)

```typescript
// Ações brasileiras: adiciona .SA
GET https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA?interval=1d&range=1d

// Stocks dos EUA: sem sufixo
GET https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d

// Vantagens:
- ✅ Gratuito, sem API key
- ✅ Dados em tempo real
- ✅ Suporte global (ações BR e EUA)
- ✅ Dados históricos completos

// Desvantagens:
- ❌ Rate limiting não documentado
- ❌ API não oficial
- ❌ Sem suporte a criptomoedas
```

### Brapi (Prioridade 2)

```typescript
```

### CoinGecko (Fallback Crypto)

```typescript
// Cotação de criptomoeda
GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true

// Mapeamento comum:
BTC -> bitcoin
ETH -> ethereum
BNB -> binancecoin

// Vantagens:
- ✅ Gratuito para cotações básicas
- ✅ Suporte a 10.000+ criptomoedas
- ✅ Dados confiáveis

// Desvantagens:
- ❌ Rate limit: 10-50 req/min
- ❌ Requer mapeamento de símbolos
```

### Alpha Vantage (Fallback USA)

```typescript
// Requer API key (gratuito com limite)
GET https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=YOUR_KEY

// Configure em .env.local:
ALPHA_VANTAGE_KEY=sua_chave_aqui

// Vantagens:
- ✅ Dados oficiais de stocks dos EUA
- ✅ API key gratuita disponível

// Desvantagens:
- ❌ Limite: 5 req/min (free tier)
- ❌ Só stocks dos EUA
```

## Fluxo de Decisão de APIs

```mermaid
graph TD
  A[getUnifiedQuote(ticker, type, cur)] --> B{Crypto?}
  B -- SIM --> C[1. Brapi]
  C --> D[2. CoinGecko]
  D --> E[3. Retorna]
  B -- NÃO --> F[1. Yahoo]
  F --> G[2. Brapi]
  G --> H[3. Alpha V.]
  H --> E
```

## Configuração de Variáveis de Ambiente

No **Vars** da sidebar do v0, adicione:

```bash
# Obrigatório para melhor performance
BRAPI_TOKEN=seu_token_aqui

# Opcional para fallback adicional
ALPHA_VANTAGE_KEY=sua_chave_aqui
```

**Como obter tokens:**

1. **Brapi**: https://brapi.dev/dashboard (gratuito com limites)
2. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (gratuito)

## Próximas Integrações

- [x] Yahoo Finance (stocks BR e EUA)
- [x] CoinGecko (crypto alternativo)
- [x] Alpha Vantage (stocks americanos)
- [ ] Binance API (crypto real-time)
- [ ] Status Invest (fundamentalista)
- [ ] B3 Official API (institucional)
- [ ] HG Brasil (alternativa nacional)

## Solução de Problemas

### Erro 429 (Too Many Requests)

**Sintoma**: `Brapi API error: 429 Too Many Requests`

**Solução**: O sistema agora processa tickers sequencialmente com delay de 300ms entre chamadas. Se persistir, o fallback para Yahoo Finance será usado automaticamente.

### Erro 404 (Ativo Não Encontrado)

**Sintoma**: `No quote found for {ticker}`

**Solução**: 
1. Verifique se o ticker está correto
2. Para ações BR, use formato sem .SA (ex: PETR4, não PETR4.SA)
3. Para criptos, use símbolo curto (BTC, ETH, não bitcoin)
4. O sistema tentará múltiplas APIs automaticamente

### Cotação Não Atualiza

**Sintoma**: Preços desatualizados ou sempre os mesmos

**Solução**:
1. Verifique conexão com internet
2. Veja logs no console para identificar qual API falhou
3. Sistema usa fallback automático - se todas APIs falharem, erro será exibido

### Preço Histórico Indisponível

**Sintoma**: "Preço histórico indisponível. Usando cotação atual."

**Solução**: Para datas antigas (>7 dias para crypto, >30 dias para ações), APIs gratuitas podem não ter dados. O sistema usa preço atual como fallback.
