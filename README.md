
  # WorkHub MTY

  Frontend de **WorkHub**, construido con React + TypeScript + Vite.

  ## ¿Qué es WorkHub?

  WorkHub es una plataforma para gestionar espacios de trabajo en oficinas con esquema híbrido (escritorios, salas de reuniones y estacionamientos). Permite a los colaboradores reservar y administrar su día en la oficina, y al equipo administrador gestionar la disponibilidad de espacios y usuarios.

  ### Funcionalidades principales

  - **Inicio de sesión y perfil**: autenticación de usuarios, recuperación de contraseña y gestión de datos personales y de vehículo (`Login`, `ForgotPassword`, `Profile`).
  - **Dashboard**: vista general con estadísticas de uso, próximas reservas y recomendaciones generadas por IA (`Dashboard`).
  - **Mapa interactivo**: exploración de edificios, pisos y zonas para visualizar la disponibilidad de escritorios, salas y lugares de estacionamiento (`Map` / `MapView`).
  - **Reservas**: creación de reservas de espacios (escritorio, sala de reuniones o estacionamiento) y consulta del historial de reservas anteriores (`Reservation`, `ReservationHistory`).
  - **Check-in / Check-out**: confirmación de llegada y salida de un espacio reservado (incluye QR/geolocalización), extensión de reservas y reporte de incidentes (`CheckInOut`).
  - **Carpool**: publicación y búsqueda de viajes compartidos hacia/desde la oficina, con seguimiento del estado del viaje (`Carpool`).
  - **Gamificación**: sistema de puntos, insignias y tabla de clasificación que incentiva el buen uso de los espacios y la asistencia (`Gamification`).
  - **Asistente de IA**: burbuja de chat disponible en toda la aplicación que ofrece recomendaciones de espacios/estacionamiento y ayuda de navegación (`AIChatBubble`).
  - **Panel de administración**: gestión de edificios, pisos, zonas, espacios, bloqueos, usuarios y recompensas de gamificación, disponible solo para usuarios administradores (`Admin`, `AdminPanel`).

  ## Arquitectura

  - **React 18 + TypeScript + Vite** como base del proyecto.
  - **Estilos**: Tailwind CSS v4, componentes de Material UI (MUI).
6  - **Enrutamiento**: `react-router` mediante `createBrowserRouter` (ver [src/app/routes.ts](src/app/routes.ts)). Las rutas protegidas se agrupan bajo `ProtectedLayout`.
  - **Capa de servicios** (`src/services`): clientes HTTP hacia el backend (NestJS). La URL base se toma del environment, ver [src/services/api.ts](src/services/api.ts).
  - **Providers globales**: `ToastProvider` y `ConfirmProvider` envuelven la aplicación en [src/app/App.tsx](src/app/App.tsx) para notificaciones y diálogos de confirmación.
  - **Layouts**: `ProtectedLayout` (control de acceso) y `DashboardLayout` (estructura visual del panel principal).

  ## Uso del sistema

  Requisitos: Node.js y npm.

  ```bash
  # 1. Instalar dependencias
  npm i

  # 2. Configurar la URL del backend (opcional, por defecto http://localhost:3000)
  # crear un archivo .env con: VITE_API_URL=http://localhost:3000

  # 3. Iniciar el servidor de desarrollo
  npm run dev

  # 4. Generar build de producción
  npm run build
  ```

  La app de desarrollo corre en `https://work-hub-theta.vercel.app`.

  Credenciales de demo (entorno en línea):
  - Usuario: `admin@workhub.local`
  - Contraseña: `Admin123!`

  ## CI/CD con GitHub Actions

  El proyecto incluye workflows de GitHub Actions en [.github/workflows](.github/workflows):

  ### Linters

  El workflow [ci.yml](.github/workflows/ci.yml) ejecuta `npm run lint` (ESLint con `typescript-eslint`, `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`) en cada push y pull request a `main`.

  ### Tests

  El mismo workflow ejecuta `npm run test` (Vitest + Testing Library, entorno `jsdom`). Las pruebas viven junto al código como archivos `*.test.ts`/`*.test.tsx`.

  Tras pasar lint y tests, el job `build` corre `npm run build` para validar que la build de producción (Vite) se genera correctamente.

  ### Deployment

  El workflow [deploy.yml](.github/workflows/deploy.yml) se ejecuta en cada push a `main`: corre lint y tests, y despliega a Vercel (entorno de producción) usando `vercel build` + `vercel deploy --prebuilt --prod`.

  Requiere configurar los siguientes secretos en el repositorio de GitHub (Settings → Secrets and variables → Actions):
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

  ## Enlaces clave

  - Organización del proyecto: https://github.com/SpaceTec-WorkHub/
  - Repositorio Frontend: https://github.com/SpaceTec-WorkHub/WorkHub
  - Repositorio Backend: https://github.com/SpaceTec-WorkHub/backend
  - Backend en producción: https://backend-wh.onrender.com/
  - Frontend en producción: https://work-hub-theta.vercel.app/login
  - Azure DevOps: https://dev.azure.com/SpaceTec/

  ## Árbol de componentes

  ```
  src/
  ├── main.tsx
  └── app/
      ├── App.tsx              # Componente raíz: providers + router
      ├── routes.ts             # Definición de rutas
      ├── layout.tsx
      ├── layouts/
      │   └── DashboardLayout.tsx
      ├── components/
      │   ├── ProtectedLayout.tsx   # Guard de rutas autenticadas
      │   ├── AdminOnlyRoute.tsx    # Guard de rutas de administrador
      │   ├── Sidebar.tsx
      │   ├── Layout.tsx
      │   ├── AIChatBubble.tsx      # Burbuja del asistente IA
      │   ├── feedback/
      │   │   ├── ToastProvider.tsx
      │   │   └── ConfirmProvider.tsx
      │   ├── layout/
      │   │   └── Layout.tsx
      │   └── ui/                   # Componentes base reutilizables (shadcn/Radix)
      ├── pages/
      │   ├── Login.tsx / ForgotPassword.tsx
      │   ├── Dashboard.tsx
      │   ├── Map.tsx / MapView.tsx
      │   ├── Reservation.tsx / ReservationHistory.tsx
      │   ├── CheckIn.tsx / CheckInOut.tsx
      │   ├── Admin.tsx / AdminPanel.tsx
      │   ├── Gamification.tsx
      │   ├── Carpool.tsx
      │   └── Profile.tsx
      ├── data/
      └── assets/

  services/                  # Clientes de API hacia el backend
  ├── api.ts
  ├── auth.ts
  ├── reservation.ts
  ├── space.ts
  ├── hierarchy.ts
  ├── gamification.ts
  ├── carpool.ts
  ├── notifications.ts
  ├── ia.ts
  └── navigationAI.ts

  styles/                    # Tailwind, temas y fuentes
  ```
  
