# Guia de Deploy - FinControl

## Pre-requisitos

1. Conta no Supabase (gratuito): https://supabase.com
2. Conta no servico de hospedagem (Render, Vercel, Railway, etc.)
3. Node.js 18+ instalado localmente

---

## IMPORTANTE: Seguranca

Este projeto foi atualizado para corrigir a vulnerabilidade CVE-2025-55182 (React Server Components RCE).

**Versoes seguras utilizadas:**
- Next.js: 16.0.7+
- React: 19.2.1+

**Recursos de seguranca implementados:**
- Headers de seguranca (CSP, X-Frame-Options, etc.)
- Sanitizacao de inputs com DOMPurify
- Rate limiting para prevenir ataques de forca bruta
- Validacao de UUID e tipos
- Row Level Security (RLS) no Supabase

---

## Passo 1: Configurar o Supabase

### 1.1 Criar Projeto

1. Acesse https://supabase.com/dashboard
2. Clique em "New Project"
3. Escolha um nome e senha para o banco de dados
4. Selecione a regiao mais proxima (South America para BR)
5. Aguarde a criacao do projeto (~2 minutos)

### 1.2 Executar Scripts do Banco de Dados

**IMPORTANTE:** Execute os scripts na ordem correta!

1. No dashboard do Supabase, va em **SQL Editor**
2. Clique em **New Query**
3. Execute os scripts na seguinte ordem:

#### Script 1: Tabelas Principais
```
scripts/000_FULL_DATABASE_SETUP.sql
```

#### Script 2: Tabelas de Investimentos
```
scripts/005_investments_tables.sql
```

#### Script 3: Campos Adicionais de Investimentos
```
scripts/007_add_investment_fields.sql
```

#### Script 4: Tabela de Notificacoes
```
scripts/008_create_notificacoes.sql
```

**Copie TODO o conteudo de cada arquivo, cole no editor e clique em "Run".**

### 1.3 Obter Credenciais

1. Va em **Settings** > **API**
2. Copie os valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 1.4 Configurar Autenticacao

1. Va em **Authentication** > **URL Configuration**
2. Em **Site URL**, coloque sua URL de producao
3. Em **Redirect URLs**, adicione:
   - `https://seu-dominio.com/*`
   - `http://localhost:3000/*` (para desenvolvimento)

---

## Passo 2: Variaveis de Ambiente

### Arquivo `.env.local` (Desenvolvimento)

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variaveis:

```env
# ========================================
# SUPABASE (Obrigatorio)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Redirecionamento (deixe vazio em producao)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=

# ========================================
# APIS DE COTACOES (Opcional - Sistema usa Yahoo Finance como fallback)
# ========================================

# Brapi - API para cotacoes BR (https://brapi.dev)
# Obtenha seu token gratuito em: https://brapi.dev/dashboard
# IMPORTANTE: Use Authorization header com Bearer token
# Exemplo de uso correto da API:
#   Authorization: Bearer seu_token_aqui
#   GET https://brapi.dev/api/quote/PETR4,MGLU3?fundamental=true
BRAPI_TOKEN=seu_token_brapi_aqui

# Alpha Vantage - Fallback para cotacoes (https://www.alphavantage.co)
# Obtenha sua key gratuita em: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=sua_key_aqui

# Finnhub - Fallback adicional (https://finnhub.io)
# Obtenha sua key gratuita em: https://finnhub.io/register
FINNHUB_API_KEY=sua_key_aqui

# ========================================
# APIS USADAS AUTOMATICAMENTE (Sem config necessaria)
# ========================================
# - Yahoo Finance: Usado como API PRINCIPAL (sem API key necessaria)
# - HG Brasil: Usado como fallback secundario (demo key incluida)
```

### Variaveis de Ambiente na Vercel

No painel do projeto na Vercel, va em **Settings** > **Environment Variables** e adicione:

| Nome da Variavel | Valor | Obrigatorio |
|-----------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anonima do Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servico do Supabase | Sim |
| `BRAPI_TOKEN` | Token da API Brapi (ex: sUCSXQ4LUHgtgLpa5WmZ4H) | Opcional |
| `ALPHA_VANTAGE_API_KEY` | Key do Alpha Vantage | Opcional |
| `FINNHUB_API_KEY` | Key do Finnhub | Opcional |

**NOTA:** O sistema funciona SEM nenhuma API key configurada! Yahoo Finance e usado como fallback principal.

---

## Sistema de APIs de Cotacoes

O sistema utiliza multiplas APIs com fallback automatico:

### Ordem de Prioridade:
1. **Yahoo Finance** (Principal - SEM API key necessaria)
2. **Brapi** (Se BRAPI_TOKEN configurado) - **CORRIGIDO: Agora usa Authorization header**
3. **HG Brasil** (Demo key incluida)
4. **Alpha Vantage** (Se ALPHA_VANTAGE_API_KEY configurado)
5. **Finnhub** (Se FINNHUB_API_KEY configurado)

### Como funciona:
- O sistema tenta a primeira API disponivel
- Se falhar, automaticamente tenta a proxima
- Logs no console indicam qual API foi usada: `[v0] Got quote from Yahoo Finance for PETR4`
- Se todas falharem, o preco medio cadastrado e usado

### Brapi - Uso Correto da API:

A API Brapi requer autenticacao via **Authorization header** (nao query parameter):

```javascript
// ✅ CORRETO
fetch('https://brapi.dev/api/quote/PETR4', {
  headers: {
    'Authorization': 'Bearer sUCSXQ4LUHgtgLpa5WmZ4H',
    'Accept': 'application/json'
  }
})

// ❌ ERRADO (causava 404)
fetch('https://brapi.dev/api/quote/PETR4?token=sUCSXQ4LUHgtgLpa5WmZ4H')
```

**Endpoints Disponiveis:**
- `GET /api/quote/{tickers}` - Cotacoes (ex: PETR4,MGLU3)
- `GET /api/quote/list` - Listar todos os ativos
- `GET /api/available` - Buscar ativos disponiveis
- Parametros opcionais: `?fundamental=true&dividends=true&range=5d&interval=1d`

### Tokens e Keys:

| API | Variavel de Ambiente | Como obter | Limite gratuito |
|-----|---------------------|------------|-----------------|
| Yahoo Finance | Nenhuma | Automatico | Ilimitado* |
| Brapi | `BRAPI_TOKEN` | https://brapi.dev/dashboard | 1000 req/dia |
| HG Brasil | Nenhuma | Automatico (demo) | 5 req/min |
| Alpha Vantage | `ALPHA_VANTAGE_API_KEY` | https://www.alphavantage.co/support/#api-key | 5 req/min |
| Finnhub | `FINNHUB_API_KEY` | https://finnhub.io/register | 60 req/min |

*Yahoo Finance pode ter rate limiting em uso intenso

---

## Passo 3: Deploy na Vercel (Recomendado)

### 3.1 Via Dashboard (Mais Facil)

1. Acesse https://vercel.com
2. Clique em **Add New** > **Project**
3. Importe o repositorio GitHub
4. Em **Environment Variables**, adicione as variaveis listadas acima
5. Clique em **Deploy**

### 3.2 Via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy
vercel

# Adicionar variaveis de ambiente
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add BRAPI_TOKEN

# Redeploy com as variaveis
vercel --prod
```

---

## Troubleshooting

### Erro 404 nas cotacoes (Brapi) - CORRIGIDO

- **Causa:** Estava usando query parameter `?token=` em vez do Authorization header
- **Solucao:** Codigo atualizado para usar `Authorization: Bearer {token}`
- **Teste:** Verifique os logs: `[v0] Brapi: Success for PETR4 - Price: 36.50`

### Cotacoes nao carregam
- Verifique os logs: `[v0] All APIs failed for ticker: XXXX`
- O Yahoo Finance deve funcionar como fallback automatico
- Teste manualmente: `https://query1.finance.yahoo.com/v8/finance/chart/PETR4.SA`

### Erro de CORS
- Verifique se a URL do site esta nas Redirect URLs do Supabase

### Modais nao aparecem ou ficam cortados - CORRIGIDO
- **Solucao:** Todos os modais foram atualizados com:
  - Posicionamento centralizado (top-1/2, left-1/2, translate)
  - Dimensoes responsivas (max-w-[95vw], max-h-[95vh])
  - Scrollbar personalizada e acessivel
  - Formularios com containers rolaveis independentes

---

## Links Uteis

- [Documentacao Supabase](https://supabase.com/docs)
- [Documentacao Vercel](https://vercel.com/docs)
- [API Brapi](https://brapi.dev)
- [Brapi Documentacao da API](https://brapi.dev/docs)
- [Yahoo Finance API](https://query1.finance.yahoo.com)
- [Next.js Docs](https://nextjs.org/docs)
