import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ToastProvider } from './components/feedback/ToastProvider';
import { ConfirmProvider } from './components/feedback/ConfirmProvider';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ToastProvider>
  );
}
