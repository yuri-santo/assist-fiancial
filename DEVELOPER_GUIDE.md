# Guia do Desenvolvedor - FinControl

## Arquitetura do Sistema

### Estrutura de Diretórios

```
/
├── app/                    # Next.js 16 App Router
│   ├── api/               # Route handlers
│   ├── auth/              # Páginas de autenticação
│   └── dashboard/         # Dashboard protegido
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── investments/      # Investimentos
│   ├── budget/           # Orçamento
│   └── ...
├── lib/                   # Bibliotecas e utilitários
│   ├── api/              # Serviços de API
│   ├── supabase/         # Cliente Supabase
│   └── utils/            # Funções utilitárias
└── scripts/              # Scripts SQL para banco
```

## Sistema de Investimentos

### Tipos de Ativos Suportados

1. **Ações Brasileiras** (`acao`)
   - Mercado: B3
   - Moeda: BRL
   - Campos: ticker, quantidade, preço médio, setor, corretora
   - Cálculo: Quantidade × Preço

2. **FIIs** (`fii`)
   - Mercado: B3
   - Moeda: BRL
   - Similar a ações, com foco em fundos imobiliários

3. **ETFs** (`etf`)
   - Mercado: B3, NYSE, NASDAQ
   - Moeda: BRL, USD
   - Fundos negociados em bolsa

4. **BDRs** (`bdr`)
   - Mercado: B3
   - Moeda: BRL
   - Brazilian Depositary Receipts

5. **Stocks** (`stock`)
   - Mercado: NYSE, NASDAQ
   - Moeda: USD
   - Ações americanas

6. **REITs** (`reit`)
   - Mercado: NYSE, NASDAQ
   - Moeda: USD
   - Real Estate Investment Trusts

7. **Criptomoedas** (`cripto`)
   - Mercado: Crypto
   - Moeda: BRL, USD
   - **Peculiaridade**: Usa cálculo reverso
   - Campos: ticker, **valor investido**, preço na compra
   - Cálculo: **Quantidade = Valor Investido ÷ Preço**
   - API: Brapi v2 Crypto (`/api/v2/crypto`)

### APIs de Cotações

#### Ações e Fundos (Brapi + Yahoo Finance)

```typescript
import { getCotacao } from "@/lib/api/brapi"

const quote = await getCotacao("PETR4")
// Retorna: { regularMarketPrice, regularMarketChangePercent, ... }
```

#### Criptomoedas (Brapi v2)

```typescript
import { getCryptoCotacao } from "@/lib/api/crypto-service"

const crypto = await getCryptoCotacao("BTC", "BRL")
// Retorna: { regularMarketPrice, marketCap, circulatingSupply, ... }
```

### Fluxo de Adição de Ativos

1. **Seleção do Tipo**: Usuário escolhe o tipo de ativo
2. **Busca do Ticker**: API específica para cada tipo
3. **Obtenção da Cotação**: Automática ao selecionar ticker
4. **Preenchimento de Campos**:
   - **Modo Shares** (ações, FIIs, ETFs): Quantidade + Preço Médio
   - **Modo Value** (criptomoedas): Valor Investido + Preço → Quantidade automática
5. **Validação e Salvamento**: Dados persistidos no Supabase

### Cálculos Financeiros

#### Valor Atual
```
Valor Atual = Quantidade × Cotação Atual
```

#### Lucro/Prejuízo
```
L/P = (Cotação Atual - Preço Médio) × Quantidade
L/P% = ((Cotação Atual - Preço Médio) / Preço Médio) × 100
```

#### Criptomoedas (Cálculo Reverso)
```
Quantidade = Valor Investido ÷ Preço na Compra
Valor Atual = Quantidade × Cotação Atual
```

## Banco de Dados (Supabase)

### Tabela: renda_variavel

```sql
CREATE TABLE renda_variavel (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  ticker TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('acao', 'fii', 'etf', 'bdr', 'stock', 'reit', 'cripto')),
  quantidade DECIMAL(12,8),  -- 8 decimais para cripto
  preco_medio DECIMAL(12,8),
  data_compra DATE,
  corretora TEXT,
  setor TEXT,
  moeda TEXT CHECK (moeda IN ('BRL', 'USD', 'EUR')),
  mercado TEXT CHECK (mercado IN ('b3', 'nyse', 'nasdaq', 'crypto')),
  observacoes TEXT,
  created_at TIMESTAMP
);
```

## Componentes Principais

### AddRendaVariavelDialog

Modal responsivo para adicionar ativos com:
- Busca inteligente (ações ou cripto)
- Obtenção automática de cotação
- Cálculo automático de quantidade (modo value)
- Campos condicionais por tipo
- Validação de formulário

### RendaVariavelList

Lista de ativos com:
- Exibição de cotações em tempo real
- Cálculo de lucro/prejuízo
- Badges coloridos por tipo
- Ordenação e filtros
- Modal de detalhes

## Variáveis de Ambiente

```env
# Brapi API (requerido)
BRAPI_TOKEN=seu_token_aqui

# Supabase (requerido)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

## Boas Práticas

### 1. Tratamento de Erros
- Sempre use try/catch em chamadas de API
- Exiba mensagens de erro amigáveis ao usuário
- Log de erros no console para debug

### 2. Performance
- Cache de cotações (evitar chamadas excessivas)
- Debounce em buscas (500ms)
- Lazy loading de modais

### 3. UX
- Feedback visual durante loading
- Validação em tempo real
- Autocompletar tickers comuns
- Sugestões baseadas no tipo selecionado

### 4. Segurança
- Row Level Security (RLS) no Supabase
- Validação server-side em route handlers
- Sanitização de inputs
- Token de API em variável de ambiente

## Troubleshooting

### Erro 404 na API Brapi
- **Causa**: Token não configurado ou formato incorreto
- **Solução**: Verificar `Authorization: Bearer {token}` no header

### Cotação não atualiza
- **Causa**: Rate limiting da API
- **Solução**: Implementar cache local (tabela `cotacoes_historico`)

### Quantidade não calcula automaticamente
- **Causa**: Tipo de ativo incorreto ou campos vazios
- **Solução**: Verificar `calcMode` e valores de `valor_investido`/`preco_medio`

## Próximas Features

- [ ] Suporte a múltiplas exchanges de cripto
- [ ] Histórico de transações (compra/venda)
- [ ] Dividendos e proventos
- [ ] Rebalanceamento de carteira
- [ ] Alertas de preço
- [ ] Importação de planilhas
- [ ] Integração com corretoras (API)

## Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Suporte

Para dúvidas ou problemas:
- Abra uma issue no GitHub
- Consulte a documentação da [Brapi](https://brapi.dev/docs)
- Consulte a documentação do [Supabase](https://supabase.com/docs)
