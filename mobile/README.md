# PlayCifras — App mobile (Expo / React Native)

App Android e iOS do PlayCifras. Consome a API do site Next.js (`/api/mobile/*` + `/api/songs`, `/api/search`, etc.).

## Pré-requisitos

- Node 20+
- Site PlayCifras rodando (`npm run dev` na raiz) **ou** URL de produção
- Expo Go (dev) / EAS CLI (builds de loja)
- Contas: [Apple Developer](https://developer.apple.com) + [Google Play Console](https://play.google.com/console)

## Setup

```bash
cd mobile
cp .env.example .env
# Ajuste EXPO_PUBLIC_API_URL:
# - Emulador Android: http://10.0.2.2:3000 (já é o default sem .env)
# - iOS Simulator: http://localhost:3000
# - Device físico: http://IP-DA-SUA-MAQUINA:3000
# - Produção: https://seu-dominio.com

npm install
npm start
```

## Scripts

| Comando | Uso |
|---|---|
| `npm start` | Expo Dev Server |
| `npm run android` | Abre no Android |
| `npm run ios` | Abre no iOS (macOS) |
| `npm run eas:login` | Login no Expo (usa o eas-cli local) |
| `npm run eas:init` | Cria o projeto EAS e grava o `projectId` |
| `npm run build:ios` | Build App Store (TestFlight) |
| `npm run submit:ios` | Envia o último build ao App Store Connect |

Use os scripts acima em vez de `npx eas ...` — o `npx` costuma servir um cache
quebrado do `eas-cli` (`Cannot find module '@sentry/core'`).

## Auth

- Login email/senha → `POST /api/mobile/auth/login`
- Token em `expo-secure-store`
- Favoritos → Bearer em `/api/mobile/favorites`

Configure `AUTH_SECRET` no backend. Google Sign-In no app: configure client IDs e `POST /api/mobile/auth/google`.

## Bundle IDs

- iOS: `com.playcifras.app`
- Android: `com.playcifras.app`

## Lojas (checklist)

1. `npm run eas:login` + `npm run eas:init` (gera `projectId` real em `app.json`)
2. Políticas no site: `/privacidade` e `/termos`
3. Ícones / splash em `assets/images/`
4. Screenshots (telefone)
5. TestFlight + Play internal testing → produção

## Telas MVP

- Início (ranking)
- Buscar
- Cifra (acordes tocáveis + favoritar)
- Favoritos
- Perfil / Login
