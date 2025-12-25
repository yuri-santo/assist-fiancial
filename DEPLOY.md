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

### 1.3 Executar Script de Investimentos

1. No SQL Editor, crie uma nova query
2. Copie o conteudo de `scripts/005_investments_tables.sql`
3. Execute para criar as tabelas de investimentos

### 1.4 Obter Credenciais

1. Va em **Settings** > **API**
2. Copie os valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 1.5 Configurar Autenticacao

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
# SUPABASE (Obrigatório)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Redirecionamento (deixe vazio em producao)
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=

# ========================================
# APIS DE COTACOES (Opcional mas recomendado)
# ========================================

# Brapi - API principal para cotacoes BR (https://brapi.dev)
# Obtenha seu token gratuito em: https://brapi.dev/dashboard
BRAPI_TOKEN=sUCSXQ4LUHgtgLpa5WmZ4H

# Alpha Vantage - Fallback para cotacoes (https://www.alphavantage.co)
# Obtenha sua key gratuita em: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=demo

# Finnhub - Fallback adicional (https://finnhub.io)
# Obtenha sua key gratuita em: https://finnhub.io/register
FINNHUB_API_KEY=

# ========================================
# APIS USADAS AUTOMATICAMENTE (Sem config necessaria)
# ========================================
# - Yahoo Finance: Usado como fallback principal (sem API key)
# - HG Brasil: Usado como fallback secundario (demo key)
```

### Variaveis de Ambiente na Vercel

No painel do projeto na Vercel, va em **Settings** > **Environment Variables** e adicione:

| Nome da Variavel | Descricao | Obrigatorio |
|-----------------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anonima do Supabase | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de servico do Supabase | Sim |
| `BRAPI_TOKEN` | Token da API Brapi para cotacoes | Recomendado |
| `ALPHA_VANTAGE_API_KEY` | Key do Alpha Vantage (fallback) | Opcional |
| `FINNHUB_API_KEY` | Key do Finnhub (fallback) | Opcional |

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

## Passo 4: Deploy no Render (Gratuito)

### 4.1 Preparar Repositorio

1. Faca push do codigo para um repositorio GitHub
2. Certifique-se que o `.gitignore` inclui `.env.local`

### 4.2 Criar Web Service no Render

1. Acesse https://render.com e faca login
2. Clique em **New** > **Web Service**
3. Conecte seu repositorio GitHub
4. Configure:
   - **Name**: fincontrol (ou outro nome)
   - **Region**: Oregon (ou mais proxima)
   - **Branch**: main
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### 4.3 Configurar Variaveis de Ambiente

No painel do Render, va em **Environment** e adicione as variaveis listadas na secao 2.

---

## Sistema de APIs de Cotacoes

O sistema utiliza multiplas APIs com fallback automatico:

### Ordem de Prioridade:
1. **Yahoo Finance** (Principal - sem API key necessaria)
2. **Brapi** (Com token - melhor para acoes BR)
3. **HG Brasil** (Demo key incluida)
4. **Alpha Vantage** (Fallback com API key)
5. **Finnhub** (Fallback adicional)

### Como funciona:
- Se a primeira API falhar, o sistema automaticamente tenta a proxima
- Logs no console indicam qual API foi usada: `[v0] Got quote from Yahoo Finance for PETR4`
- Se todas falharem, o preco medio cadastrado e usado como fallback

### Tokens e Keys:

| API | Como obter | Limite gratuito |
|-----|-----------|-----------------|
| Brapi | https://brapi.dev/dashboard | 1000 req/dia |
| Alpha Vantage | https://www.alphavantage.co/support/#api-key | 5 req/min |
| Finnhub | https://finnhub.io/register | 60 req/min |
| Yahoo Finance | Sem necessidade | Ilimitado* |
| HG Brasil | Demo incluida | 5 req/min |

*Yahoo Finance pode ter rate limiting em uso intenso

---

## Verificacao Final

Apos o deploy, verifique:

- [ ] Landing page carrega corretamente
- [ ] Pagina de login funciona
- [ ] Cadastro de usuario funciona
- [ ] Email de confirmacao e enviado
- [ ] Dashboard carrega apos login
- [ ] Animacoes funcionam corretamente
- [ ] Dados sao salvos no banco
- [ ] Graficos aparecem corretamente
- [ ] Investimentos exibem cotacoes (verificar logs: `[v0] Got quote from...`)
- [ ] Modal de detalhes do ativo abre corretamente
- [ ] Exportacao Excel/CSV funciona
- [ ] Headers de seguranca estao ativos (verificar no DevTools > Network)

---

## Troubleshooting

### Erro de CORS
- Verifique se a URL do site esta nas Redirect URLs do Supabase

### Erro de Autenticacao
- Confirme que as variaveis de ambiente estao corretas
- Verifique se o script SQL foi executado

### Pagina em branco
- Verifique os logs do servidor
- Confirme que o build foi bem sucedido

### Erro 404 em /rest/v1/notificacoes
- Execute o script `scripts/008_create_notificacoes.sql` no SQL Editor do Supabase

### Erro 401 nas cotacoes (Brapi)
- Verifique se o `BRAPI_TOKEN` esta configurado corretamente
- O sistema usara Yahoo Finance como fallback automaticamente

### Cotacoes nao carregam
- Verifique os logs: `[v0] All APIs failed for ticker: XXXX`
- Teste manualmente: `https://brapi.dev/api/quote/PETR4?token=SEU_TOKEN`
- O Yahoo Finance deve funcionar como fallback

### Modal de ativo nao aparece
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique se o componente AssetDetailModal esta importado corretamente

---

## Custos Estimados

| Servico | Plano | Custo |
|---------|-------|-------|
| Supabase | Free | R$ 0 |
| Render | Free | R$ 0 |
| Vercel | Hobby | R$ 0 |
| Brapi (Cotacoes) | Free | R$ 0 |
| Yahoo Finance | Free | R$ 0 |
| Hostinger | Premium | ~R$ 15/mes |

**Total minimo: R$ 0/mes** (usando Supabase + Render/Vercel + APIs gratuitas)

---

## Links Uteis

- [Documentacao Supabase](https://supabase.com/docs)
- [Documentacao Vercel](https://vercel.com/docs)
- [Documentacao Render](https://render.com/docs)
- [API Brapi (Cotacoes)](https://brapi.dev)
- [Yahoo Finance API](https://query1.finance.yahoo.com)
- [Alpha Vantage API](https://www.alphavantage.co/documentation/)
- [Next.js Docs](https://nextjs.org/docs)
