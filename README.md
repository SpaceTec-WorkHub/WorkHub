
  # WorkHub MTY UI Prototype

  Frontend de **WorkHub**, construido con React + TypeScript + Vite.

  ## Arquitectura

  - **React 18 + TypeScript + Vite** como base del proyecto.
  - **Estilos**: Tailwind CSS v4, componentes de Material UI (MUI) y primitivas de Radix UI (estilo shadcn) en `src/app/components/ui`.
  - **Enrutamiento**: `react-router` mediante `createBrowserRouter` (ver [src/app/routes.ts](src/app/routes.ts)). Las rutas protegidas se agrupan bajo `ProtectedLayout`.
  - **Capa de servicios** (`src/services`): clientes HTTP hacia el backend (NestJS). La URL base se toma de `VITE_API_URL` (por defecto `http://localhost:3000`), ver [src/services/api.ts](src/services/api.ts).
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

  La app de desarrollo corre en `http://localhost:5173`.

  Credenciales de demo (entorno en línea):
  - Usuario: `demo@workhub.local`
  - Contraseña: `WorkHub123!`

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
  