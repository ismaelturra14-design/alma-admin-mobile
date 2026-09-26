# Alma Médica Mobile

Aplicación Expo + React Native + TypeScript para la autenticación del backend actual del web de Alma Médica.

## Contrato backend que se respeta

- Base URL: https://starfish-app-2-5jds5.ondigitalocean.app/api_nestjs
- Login: POST /auth/login/web
- Body: { username, password }
- Respuesta esperada: { status, data, tokens: { access_token, refresh_token, access_expires_in } }
- Autorización: Authorization: Bearer <access_token>
- Refresh: POST /auth/refresh-token con { refresh_token }
- Logout real: no encontrado en el repo web
- /me o profile: no encontrado

## Requisitos

- Node.js 20+
- npm o bun
- Expo CLI
- Android Studio o Xcode (opcional, según el método de ejecución)

## Instalación

```bash
npm install
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta si es necesario:

```bash
cp .env.example .env
```

Contenido recomendado:

```env
EXPO_PUBLIC_API_BASE_URL=https://starfish-app-2-5jds5.ondigitalocean.app/api_nestjs
```

## Ejecutar la app

### Desarrollo local

```bash
npm start
```

### Android

```bash
npm run android
```

### iOS

```bash
npm run ios
```

### Web

```bash
npm run web
```

## Arquitectura clave

- `src/api/axiosClient.ts`: cliente Axios con refresh token y manejo de 401.
- `src/api/authApi.ts`: endpoints de autenticación.
- `src/services/authService.ts`: persistencia y lógica de sesión.
- `src/context/AuthContext.tsx`: estado global de autenticación.
- `src/store/sessionStore.ts`: almacenamiento seguro con `expo-secure-store`.
- `src/components/auth/LoginForm.tsx`: formulario de login.
- `src/screens/auth/LoginScreen.tsx`: pantalla de acceso.
- `src/screens/home/HomeScreen.tsx`: pantalla principal autenticada.

## Seguridad y validación

- Los tokens sensibles se guardan con `expo-secure-store`.
- No se guarda información sensible en logs ni texto plano.
- Si el refresh falla, se limpia la sesión y se fuerza el login.
- No se inventan endpoints ni contratos que no existan en el código web real.

## Detecciones importantes

> No se encontró logout real en el backend web revisado. La limpieza de sesión se hace localmente en la app.
>
> No se encontró un endpoint /auth/me o perfil real implementado en el proyecto web.

## Validación rápida

```bash
npm run typecheck
```

## Estructura principal

```text
src/
  api/
  app/
  components/
  config/
  constants/
  context/
  navigation/
  screens/
  services/
  store/
  theme/
  types/
  utils/
```
