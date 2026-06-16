# Contas e Credenciais Necessárias

## 1. Supabase (banco de dados + auth)
**Grátis para começar**

1. Acesse https://supabase.com e crie conta
2. Crie novo projeto (ex: `bubas-solar`)
3. Anote:
   - `SUPABASE_URL` — em Settings → API → Project URL
   - `SUPABASE_ANON_KEY` — em Settings → API → anon/public
   - `SUPABASE_SERVICE_ROLE_KEY` — em Settings → API → service_role (só no backend, nunca no app)
4. Em Settings → Auth → desative "Enable email confirmations" (para simplificar login inicial)

---

## 2. Railway (hospedagem do backend Node.js)
**Grátis até $5/mês de uso**

1. Acesse https://railway.app e crie conta (pode usar GitHub)
2. Crie novo projeto vazio — o deploy será feito via GitHub depois
3. Anote o domínio gerado (ex: `https://bubas-solar-backend.up.railway.app`)
4. Após deploy, configure as variáveis de ambiente no painel Railway (listadas abaixo)

---

## 3. SolisCloud / SolarZ — API Key
**Obrigatório para dados de geração**

1. Acesse https://www.soliscloud.com com sua conta de instalador
2. Vá em **Serviços → Gerenciamento de API**
3. Ative o recurso de API (pode pedir verificação por email/SMS)
4. Anote:
   - `SOLIS_API_ID` — chave da API
   - `SOLIS_API_SECRET` — segredo da API
   - `SOLIS_API_URL` — normalmente `https://www.soliscloud.com:13333`

> **Alternativa:** Se não encontrar, entre em contato com suporte Solis via WhatsApp **(19) 9 9961-8000** e siga o menu para solicitar liberação de API. Pode levar 1-2 dias úteis.

---

## 4. Expo (build iOS + Android + Web)
**Grátis para projetos pessoais**

1. Acesse https://expo.dev e crie conta
2. Instale EAS CLI: `npm install -g eas-cli`
3. Faça login: `eas login`
4. Anote seu `EXPO_ACCOUNT_NAME` (slug do seu perfil)

---

## 5. Apple Developer (iOS — opcional para v1)
**$99/ano — necessário só para publicar na App Store**

1. Acesse https://developer.apple.com/programs/
2. Enroll como Individual ou Organization
3. Para testes internos (TestFlight) já é suficiente durante desenvolvimento
4. Anote seu `APPLE_TEAM_ID` — em Membership → Team ID

---

## 6. Google Play Console (Android — opcional para v1)
**$25 taxa única — necessário só para publicar**

1. Acesse https://play.google.com/console
2. Crie conta de desenvolvedor
3. Para testes internos, não precisa publicar — APK via EAS já funciona

---

## Variáveis de Ambiente

### Backend (Railway)
```env
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# SolisCloud
SOLIS_API_ID=
SOLIS_API_SECRET=
SOLIS_API_URL=https://www.soliscloud.com:13333

# JWT
JWT_SECRET=         # gere com: openssl rand -base64 64
JWT_REFRESH_SECRET= # gere com: openssl rand -base64 64

# Geral
NODE_ENV=production
PORT=3000
```

### App Expo (.env.local)
```env
EXPO_PUBLIC_API_URL=https://seu-backend.up.railway.app
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Ordem de Setup

1. [ ] Criar conta Supabase → anotar URL + keys
2. [ ] Solicitar API key SolisCloud (pode demorar 1-2 dias)
3. [ ] Criar conta Railway
4. [ ] Criar conta Expo + instalar EAS CLI
5. [ ] Gerar JWT secrets (`openssl rand -base64 64`)
6. [ ] (Opcional) Apple Developer + Google Play
