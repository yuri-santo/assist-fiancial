# Guia de Integração de APIs - FinControl

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
// lib/api/stock-service.ts
class StockService {
  private providers = [
    new YahooFinanceProvider(),    // Prioridade 1 (sem API key)
    new BrapiProvider(),            // Prioridade 2 (com token)
    new HGBrasilProvider(),         // Prioridade 3 (fallback)
  ]

  async getQuote(ticker: string) {
    for (const provider of this.providers) {
      const quote = await provider.fetchQuote(ticker)
      if (quote && quote.price > 0) return quote
    }
    return null
  }
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

1. **Batch Requests**: Agrupar múltiplos tickers em uma chamada
2. **Debounce**: 500ms de delay em buscas
3. **Cache**: Armazenar cotações por 15 minutos
4. **Timeout**: 8 segundos máximo por requisição
5. **Fallback**: Sempre ter API alternativa
6. **Error Handling**: Tratar 404, 429, 500 separadamente

### Exemplos de Uso

#### Buscar Cotação com Fallback

```typescript
import { getStockQuote } from "@/lib/api/stock-service"

const quote = await getStockQuote("PETR4")
if (quote) {
  console.log(`${quote.symbol}: ${quote.price} (${quote.source})`)
}
```

#### Buscar Criptomoeda

```typescript
import { getCryptoCotacao } from "@/lib/api/crypto-service"

const crypto = await getCryptoCotacao("BTC", "BRL")
if (crypto) {
  console.log(`Bitcoin: R$ ${crypto.regularMarketPrice}`)
}
```

#### Buscar Múltiplas Cotações

```typescript
import { getStockQuotes } from "@/lib/api/stock-service"

const tickers = ["PETR4", "VALE3", "ITUB4"]
const quotes = await getStockQuotes(tickers)

quotes.forEach((quote, ticker) => {
  console.log(`${ticker}: ${quote.price}`)
})
```

### Tratamento de Erros

```typescript
try {
  const quote = await getCotacao(ticker)
  if (!quote) {
    // Erro 404 ou timeout
    setError("Ativo não encontrado. Verifique o ticker.")
  }
} catch (error) {
  // Erro de rede ou API
  console.error("[v0] API Error:", error)
  setError("Erro ao buscar cotação. Tente novamente.")
}
```

### Debugging

```typescript
// Ativar logs detalhados
console.log("[v0] Fetching quote for", ticker)
console.log("[v0] API Response:", response.status, data)
console.log("[v0] Using provider:", provider.name)
```

## Yahoo Finance (Fallback Gratuito)

```typescript
// Não requer API key
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.SA`

// Resposta similar ao Brapi
const meta = data.chart.result[0].meta
```

## Próximas Integrações

- [ ] Alpha Vantage (stocks americanos)
- [ ] CoinGecko (crypto alternativo)
- [ ] Binance API (crypto real-time)
- [ ] Status Invest (fundamentalista)
- [ ] B3 Official API (institucional)
