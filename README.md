# FinControl - Financial Assistant v3

Sistema completo de controle financeiro pessoal e empresarial com interface futuristica e recursos avancados.

## Funcionalidades Principais

- **Controle de Despesas e Receitas** - Categorize e acompanhe todas as transacoes
- **Cartoes de Credito** - Gerencie multiplos cartoes, faturas e limites
- **Objetivos Financeiros** - Defina metas e visualize o progresso
- **Caixinhas Virtuais** - Organize dinheiro em envelopes digitais
- **Reserva de Emergencia** - Configure e acompanhe sua reserva
- **Orcamento** - Planeje gastos por categoria
- **Investimentos** - Portfolio completo com Renda Variavel e Renda Fixa
  - Integracao com multiplas APIs de cotacoes (Yahoo Finance, Brapi, etc.)
  - Graficos interativos com analise tecnica
  - Indicadores de volatilidade, risco e performance
- **Relatorios** - Visualizacoes detalhadas e exportacao de dados
- **Notificacoes** - Alertas inteligentes sobre financas

## Stack Tecnologica

- **Frontend:** Next.js 16, React 19.2, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes, Supabase
- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth
- **UI:** shadcn/ui, Recharts, Lucide Icons
- **3D:** React Three Fiber
- **APIs:** Yahoo Finance, Brapi, Alpha Vantage, HG Brasil, Finnhub

## Instalacao

### Pre-requisitos

- Node.js 18+
- Conta no Supabase

### Passo a Passo

1. Clone o repositorio:
```bash
git clone [url-do-repositorio]
cd financial-assistant-v3
```

2. Instale as dependencias:
```bash
npm install
# ou
pnpm install
```

3. Configure o Supabase:
   - Crie um projeto em https://supabase.com
   - Execute os scripts SQL na ordem (veja DEPLOY.md)
   - Copie as credenciais

4. Configure as variaveis de ambiente:
   - Copie `.env.example` para `.env.local`
   - Adicione suas credenciais do Supabase
   - (Opcional) Adicione tokens das APIs de cotacoes

5. Execute o projeto:
```bash
npm run dev
# ou
pnpm dev
```

Acesse http://localhost:3000

## Configuracao das APIs de Cotacoes

### API Brapi (Recomendada para Brasil)

1. Obtenha seu token gratuito em https://brapi.dev/dashboard
2. Adicione ao `.env.local`:
```env
BRAPI_TOKEN=seu_token_aqui
```

**Importante:** A API Brapi requer autenticacao via Authorization header:
```javascript
fetch('https://brapi.dev/api/quote/PETR4', {
  headers: {
    'Authorization': 'Bearer seu_token_aqui'
  }
})
```

### Sistema de Fallback

O sistema tenta as APIs nesta ordem:
1. Yahoo Finance (sem API key)
2. Brapi (se configurada)
3. HG Brasil (demo key incluida)
4. Alpha Vantage (se configurada)
5. Finnhub (se configurada)

Limite gratuito Brapi: 1000 requisicoes/dia

## Estrutura do Projeto

```
financial-assistant-v3/
├── app/                      # Pages e API routes
│   ├── dashboard/           # Dashboard protegido
│   ├── auth/                # Login e Sign-up
│   └── api/                 # API endpoints
├── components/              # Componentes React
│   ├── ui/                  # Componentes base (shadcn)
│   ├── dashboard/           # Componentes do dashboard
│   ├── investments/         # Componentes de investimentos
│   ├── forms/               # Formularios
│   └── ...
├── lib/                     # Utilidades e config
│   ├── api/                 # Clients das APIs (Brapi, Yahoo, etc.)
│   ├── supabase/            # Cliente Supabase
│   ├── utils/               # Funcoes auxiliares
│   └── security/            # Seguranca e sanitizacao
├── scripts/                 # Scripts SQL do banco
└── public/                  # Assets estaticos
```

## Deploy

Veja o guia completo em [DEPLOY.md](./DEPLOY.md)

Deploy rapido na Vercel:
1. Conecte seu repositorio GitHub
2. Configure as variaveis de ambiente
3. Deploy automatico

## Seguranca

- Next.js 16.0.7+ (correcao CVE-2025-55182)
- React 19.2.1+ (correcao vulnerabilidades RCE)
- Headers de seguranca (CSP, X-Frame-Options)
- Sanitizacao de inputs com DOMPurify
- Row Level Security (RLS) no Supabase
- Validacao de UUID e tipos

## Contribuindo

Contribuicoes sao bem-vindas! Por favor:
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudancas
4. Push para a branch
5. Abra um Pull Request

## Licenca

MIT License - veja LICENSE para detalhes

## Suporte

- Documentacao: [DEPLOY.md](./DEPLOY.md)
- Issues: Use o GitHub Issues
- API Brapi: https://brapi.dev/docs
