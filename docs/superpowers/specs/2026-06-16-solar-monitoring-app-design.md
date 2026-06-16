# Solar Monitoring App — Design Spec
**Date:** 2026-06-16  
**Project:** bubasSolar  
**Stack:** Expo (iOS/Android/Web) + Node.js/Fastify (Railway) + Supabase + SolisCloud API

---

## 1. Overview

App para clientes de instalador solar acompanharem geração de energia. Cada cliente tem login próprio e acessa dados dos seus contratos. Um contrato representa um percentual de participação em uma usina física cadastrada no SolisCloud (SolarZ).

---

## 2. Arquitetura

```
Expo App (iOS/Android/Web)
       │ HTTPS/JWT
Node.js/Fastify (Railway)
  ├── Auth (JWT por contrato)
  ├── Proxy SolisCloud + cache (polling 5min)
  ├── Lógica de % split por contrato
  ├── Histórico de reajustes
  └── Admin endpoints (instalador)
       │                    │
  Supabase (PostgreSQL)   SolisCloud API (27 endpoints)
```

**Fluxo principal:**
1. App autentica → backend retorna JWT
2. App pede produção → backend busca SolisCloud (ou cache), aplica % do contrato, retorna dados do cliente
3. SolisCloud com rate limit → backend faz polling a cada 5min e persiste no Supabase

---

## 3. Banco de Dados (Supabase/PostgreSQL)

```sql
users
  id, email, password_hash, name, phone, created_at

installers
  id, name, email, password_hash,
  soliscloud_api_id, soliscloud_api_secret, created_at

plants
  id, plant_id (SolisCloud ref), name, capacity_kwp,
  installer_id (FK), city, state, created_at

contracts
  id, user_id (FK), plant_id (FK), name,
  percentage DECIMAL(5,2),   -- ex: 30.00
  investment_brl DECIMAL(12,2),
  tariff_kwh DECIMAL(6,4),   -- R$/kWh
  active BOOLEAN, created_at

percentage_history
  id, contract_id (FK), percentage, tariff_kwh,
  changed_at, reason TEXT

production_cache
  id, plant_id (FK), date DATE,
  energy_kwh DECIMAL(10,3), peak_power_kw DECIMAL(8,3),
  cached_at TIMESTAMP
```

**Regras de negócio:**
- `produção_contrato = energy_kwh × (percentage / 100)`
- `economia_contrato = produção_contrato × tariff_kwh`
- Payback estimado: `investment_brl / economia_mensal_média_brl`
- Reajuste de % cria registro em `percentage_history` — relatórios históricos usam o % vigente na época

---

## 4. Backend API (Node.js/Fastify — Railway)

### Endpoints públicos
```
POST /auth/login              → { token, user, contracts[] }
```

### Endpoints autenticados (cliente)
```
GET /contracts                → lista de contratos do usuário
GET /production/daily         → ?date=YYYY-MM-DD&contract_id=
GET /production/range         → ?from=&to=&contract_id=
GET /savings                  → ?contract_id= (economia acumulada, payback)
GET /plant/status             → status ao vivo da usina
GET /reports/pdf              → ?month=YYYY-MM&contract_id=
```

### Endpoints admin (instalador)
```
POST   /admin/plants                         → cadastrar usina
POST   /admin/contracts                      → criar contrato
PUT    /admin/contracts/:id                  → editar contrato
PUT    /admin/contracts/:id/percentage       → reajuste % (cria histórico)
GET    /admin/plants                         → todas as usinas
GET    /admin/plants/:id/contracts           → contratos de uma usina
GET    /admin/overview                       → acúmulo total, rendimento do dia
```

### Integrações
- **SolisCloud Auth:** HMAC-SHA256 signing (API ID + Secret por instalador)
- **Polling:** cron a cada 5min → busca dados de todas as plantas → persiste em `production_cache`
- **Rate limit:** respeitado via cache; app nunca chama SolisCloud diretamente

---

## 5. App (Expo)

### Navegação
```
(auth)
  └── /login

(tabs)
  ├── / — Dashboard
  ├── /producao — Produção com filtros
  ├── /economia — Economia & payback
  ├── /usina — Dados da usina
  └── /perfil — Perfil & contato instalador

/notificacoes — Alarmes e recordes
```

### Telas

**Dashboard (Home)**
- Gauge animado: produção atual (kW) — atualiza a cada 5min (polling SolisCloud via backend)
- Card destaque: geração do dia (kWh)
- Cards secundários: mês atual / total acumulado / economia do mês
- Switcher de contratos (se o usuário tiver múltiplos)
- Status da usina (online/offline/alarme)

**Produção**
- Gráfico de barras por hora (dia) ou por dia (semana/mês/ano)
- Filtro: dia / semana / mês / ano + date picker
- Default: dia atual em destaque
- Pico de potência do período
- Comparativo com mês/ano anterior

**Economia**
- Valor total gerado (R$) vs valor investido (R$)
- Barra de progresso: % do payback concluído
- Estimativa de retorno completo (data)
- CO₂ evitado (kg) — 0.617 kg/kWh (fator ANEEL)
- Equivalente em árvores plantadas
- Histórico mensal: tabela + gráfico de linha

**Usina**
- Mapa com localização
- Capacidade instalada (kWp)
- Status ao vivo dos inversores
- Todos os contratos da usina com % visual (pizza chart)
- Histórico de alarmes

**Notificações**
- Alarmes SolisCloud (inversor offline, erro)
- Recorde de geração diária
- Resumo mensal automático

**Perfil**
- Dados do contrato (%, tarifa, investimento)
- Contato do instalador
- Logout

---

## 6. Stack Técnica

### Frontend
| Lib | Uso |
|-----|-----|
| `expo` SDK 52+ | Base iOS/Android/Web |
| `expo-router` | File-based navigation |
| `nativewind` v4 | Tailwind no React Native |
| `@tanstack/react-query` | Cache e sync de dados |
| `react-native-reanimated` 3 | Gauge animado, transições |
| `victory-native` | Gráficos (barras, linha, pizza) |
| `expo-notifications` | Push notifications |
| `expo-secure-store` | JWT storage seguro |
| `expo-location` | Mapa da usina |

### Backend
| Lib | Uso |
|-----|-----|
| `fastify` | HTTP server |
| `@fastify/jwt` | Auth JWT |
| `@fastify/rate-limit` | Rate limiting |
| `node-cron` | Polling SolisCloud 5min |
| `@supabase/supabase-js` | Acesso ao banco |
| `pdfkit` | Geração de relatórios PDF |
| `crypto` (nativo) | HMAC-SHA256 SolisCloud |

### Infra
- **App:** Expo EAS Build (iOS + Android) + Expo Web
- **Backend:** Railway (Node.js)
- **Banco:** Supabase (PostgreSQL + Auth)
- **Notificações:** Expo Push Notification Service

---

## 7. Segurança

- JWT com expiração curta (15min) + refresh token (7 dias)
- API keys SolisCloud armazenadas apenas no backend (nunca expostas ao app)
- Rate limiting por IP e por usuário no backend
- HTTPS obrigatório em todos os endpoints
- Senhas com bcrypt (cost 12)
- Admin endpoints requerem role separada

---

## 8. Features de Mercado

1. Gauge animado em tempo real (Reanimated 2)
2. Dark mode nativo
3. Export PDF relatório mensal
4. Push notifications (alarmes + recorde diário + resumo mensal)
5. CO₂ evitado + equivalente árvores
6. Payback timeline com data estimada de retorno
7. Comparativo de períodos (mês anterior, ano anterior)
8. Switcher multi-contrato no dashboard
9. Widget iOS/Android (produção atual) — fase 2
10. Gráfico pizza: distribuição de contratos na usina

---

## 9. Fora do Escopo (v1)

- Widget iOS/Android (fase 2)
- Integração com outros inversores (além de Solis)
- Painel web do instalador (admin) — fase 2, UI dedicada para gerenciar plantas/contratos via browser
- Previsão de geração baseada em clima
