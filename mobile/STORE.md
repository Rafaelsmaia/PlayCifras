# Builds de loja (EAS)

## Uma vez

O `eas-cli` está instalado como devDependency (evita o cache quebrado do `npx`).
Use sempre os scripts do npm ou `.\node_modules\.bin\eas` — **não** `npx eas`.

```bash
cd mobile
npm run eas:login
npm run eas:init   # grava projectId real em app.json → extra.eas.projectId
```

Se `npx eas ...` falhar com `Cannot find module '@sentry/core'`, limpe o cache:
`npm cache clean --force` — mas o caminho recomendado continua sendo os scripts acima.

Políticas (obrigatórias nas lojas):

- https://SEU-DOMINIO/privacidade
- https://SEU-DOMINIO/termos

Atualize `extra.privacyPolicyUrl` / `termsOfServiceUrl` em `app.json` com o domínio de produção.

## TestFlight (iOS)

TestFlight exige build **App Store** — use o profile `production`, não `preview`
(`preview` gera Ad Hoc / interno).

O projeto já está conectado ao EAS (`extra.eas.projectId`) e a URL de produção
já vai no build (`eas.json → production.env`). Falta só o login Apple para gerar
o Distribution Certificate — isso é interativo (2FA), então rode em modo normal:

```bash
cd mobile
npm run build:ios     # eas build -p ios --profile production (login Apple na 1ª vez)
npm run submit:ios    # eas submit -p ios --latest
```

Antes do build, garanta `EXPO_PUBLIC_API_URL` apontando para a API pública HTTPS
(o build não enxerga `localhost`).

## Android interno

```bash
npm run eas -- build -p android --profile preview   # APK
```

## Produção

```bash
npm run eas -- build -p all --profile production
npm run eas -- submit -p android --latest
npm run eas -- submit -p ios --latest
```

Deep link de cifra: `playcifras://cifra/<slug>`
