import React, { useEffect, useState } from 'react';
import {
  Camera,
  Car,
  Mail,
  User,
  Save,
  KeyRound,
  X,
} from 'lucide-react';

import { getStoredSession, isAdminUser } from '../../services/auth';
const API_URL = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? '';


type ProfileData = {
  full_name: string;
  email: string;
};

type VehicleData = {
  vehicle_id: number | null;
  owner_id: number | null;
  plate_number: string;
  brand: string;
  model: string;
  color: string;
  year: string;
  seats_total: number;
};

const createEmptyVehicle = (ownerId: number | null): VehicleData => ({
  vehicle_id: null,
  owner_id: ownerId,
  plate_number: '',
  brand: '',
  model: '',
  color: '',
  year: '',
  seats_total: 5,
});

const normalizeVehicle = (vehicle: Partial<VehicleData> & { owner_id?: number | null }, ownerId: number): VehicleData => ({
  vehicle_id: vehicle.vehicle_id ?? null,
  owner_id: vehicle.owner_id ?? ownerId,
  plate_number: vehicle.plate_number ?? '',
  brand: vehicle.brand ?? '',
  model: vehicle.model ?? '',
  color: vehicle.color ?? '',
  year: vehicle.year !== undefined && vehicle.year !== null ? String(vehicle.year) : '',
  seats_total: vehicle.seats_total ?? 5,
});

export default function Profile() {
  const [photo, setPhoto] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
  });

  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleData>(createEmptyVehicle(null));
  const [vehicleMessage, setVehicleMessage] = useState('');
  const [passwordPanelOpen, setPasswordPanelOpen] = useState(false);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicleSaving, setVehicleSaving] = useState(false);

  function getCurrentSessionUser() {
    const session = getStoredSession();

    const user = session?.user as { user_id?: number } | undefined;

    return {
      userId: user?.user_id ?? null,
      isAdmin: isAdminUser(),
    };
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  const refreshUserData = async () => {
    const { userId } = getCurrentSessionUser();

    if (!userId) {
      return;
    }

    const userResponse = await fetch(`${API_URL}/users/${userId}`);

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user');
    }

    const user = await userResponse.json();

    setProfile({
      full_name: user.full_name || '',
      email: user.email || '',
    });

    const vehicleResponse = await fetch(`${API_URL}/vehicle/owner/${userId}`);
    const vehicleList = vehicleResponse.ok ? await vehicleResponse.json() : [];
    const nextVehicles = Array.isArray(user.vehicles) && user.vehicles.length > 0 ? user.vehicles : vehicleList;
    const normalizedVehicles = (Array.isArray(nextVehicles) ? nextVehicles : []).map((vehicle) => normalizeVehicle(vehicle, userId));

    setVehicles(normalizedVehicles);

    if (normalizedVehicles.length > 0) {
      const firstVehicle = normalizedVehicles[0];
      setSelectedVehicleId(firstVehicle.vehicle_id);
      setVehicleForm(firstVehicle);
      setVehicleMessage('');
    } else {
      setSelectedVehicleId(null);
      setVehicleForm(createEmptyVehicle(userId));
      setVehicleMessage('');
    }
  };

  const selectVehicle = (vehicle: VehicleData) => {
    setSelectedVehicleId(vehicle.vehicle_id);
    setVehicleForm(vehicle);
    setVehicleMessage('Editando vehículo seleccionado.');
  };

  const startNewVehicle = () => {
    const { userId } = getCurrentSessionUser();
    setSelectedVehicleId(null);
    setVehicleForm(createEmptyVehicle(userId));
    setVehicleMessage('Nuevo vehículo. Completa los datos para guardarlo.');
  };

  const resetPasswordPanel = () => {
    setPasswordPanelOpen(false);
    setPasswordVerified(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordMessage('');
  };

  const handlePasswordVerify = async () => {
    const { userId } = getCurrentSessionUser();

    if (!userId) {
      return;
    }

    if (!currentPassword.trim()) {
      setPasswordMessage('Escribe tu contraseña actual.');
      return;
    }

    setPasswordMessage('');

    try {
      const response = await fetch(`${API_URL}/users/${userId}/password/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ current_password: currentPassword }),
      });

      if (!response.ok) {
        throw new Error('No se pudo validar la contraseña actual.');
      }

      setPasswordVerified(true);
      setPasswordMessage('Contraseña actual validada.');
    } catch (error) {
      console.error(error);
      setPasswordVerified(false);
      setPasswordMessage(error instanceof Error ? error.message : 'No se pudo validar la contraseña actual.');
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { userId } = getCurrentSessionUser();

    if (!userId) {
      return;
    }

    if (!passwordVerified) {
      setPasswordMessage('Primero valida tu contraseña actual.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordMessage('Completa la nueva contraseña y su confirmación.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('La nueva contraseña no coincide con la confirmación.');
      return;
    }

    setPasswordMessage('');

    try {
      const response = await fetch(`${API_URL}/users/${userId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar la contraseña.');
      }

      setPasswordMessage('Contraseña actualizada correctamente.');
      setPasswordVerified(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error(error);
      setPasswordMessage(error instanceof Error ? error.message : 'No se pudo actualizar la contraseña.');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { userId } = getCurrentSessionUser();

        if (!userId) {
          return;
        }

        await refreshUserData();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);

      const { userId } = getCurrentSessionUser();

      if (!userId) {
        return;
      }

      const userResponse = await fetch(
        `${API_URL}/users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profile),
        },
      );

      if (!userResponse.ok) {
        throw new Error('Failed to update user');
      }

      alert('Perfil actualizado correctamente');

      await refreshUserData();
    } catch (error) {
      console.error(error);
      alert('Error actualizando perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleVehicleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const { userId } = getCurrentSessionUser();

    if (!userId) {
      return;
    }

    if (!vehicleForm.plate_number.trim() || !vehicleForm.brand.trim() || !vehicleForm.model.trim()) {
      setVehicleMessage('Completa placas, marca y modelo.');
      return;
    }

    setVehicleSaving(true);
    setVehicleMessage('');

    try {
      const payload = {
        plate_number: vehicleForm.plate_number.trim().toUpperCase(),
        brand: vehicleForm.brand.trim(),
        model: vehicleForm.model.trim(),
        color: vehicleForm.color.trim(),
        year: vehicleForm.year ? Number(vehicleForm.year) : undefined,
        seats_total: Number(vehicleForm.seats_total),
        owner_id: userId,
      };

      if (selectedVehicleId) {
        const updateVehicleResponse = await fetch(`${API_URL}/vehicle/${selectedVehicleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!updateVehicleResponse.ok) {
          throw new Error('Failed to update vehicle');
        }

        setVehicleMessage('Vehículo actualizado correctamente.');
      } else {
        const createVehicleResponse = await fetch(`${API_URL}/vehicle`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!createVehicleResponse.ok) {
          throw new Error('Failed to create vehicle');
        }

        setVehicleMessage('Vehículo creado correctamente.');
      }

      await refreshUserData();
    } catch (error) {
      console.error(error);
      setVehicleMessage('Error actualizando vehículo');
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleVehicleDelete = async () => {
    if (!selectedVehicleId) {
      return;
    }

    setVehicleSaving(true);
    setVehicleMessage('');

    try {
      const deleteResponse = await fetch(`${API_URL}/vehicle/${selectedVehicleId}`, {
        method: 'DELETE',
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete vehicle');
      }

      setVehicleMessage('Vehículo eliminado correctamente.');
      await refreshUserData();
      startNewVehicle();
    } catch (error) {
      console.error(error);
      setVehicleMessage('Error eliminando vehículo');
    } finally {
      setVehicleSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500 dark:text-slate-400">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Mi perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Aquí puedes revisar y actualizar tu información personal.
        </p>
      </div>

      {/* ── Tarjeta de perfil ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="h-32 bg-purple-600 dark:bg-purple-800" />

        <div className="px-4 sm:px-6 md:px-8 pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-14">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-slate-100 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-md overflow-hidden flex items-center justify-center">
                {photo ? (
                  <img
                    src={photo}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                )}
              </div>

              <label className="absolute bottom-1 right-1 w-9 h-9 bg-purple-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-purple-700">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {profile.full_name || 'Usuario'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Usuario WorkHub MTY
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-8">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nombre completo
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="mt-1 w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Correo
              </label>
              <div className="relative mt-1">
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-4 py-3 pl-11 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setPasswordPanelOpen((current) => !current);
                  setPasswordMessage('');
                }}
                className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
              >
                <KeyRound className="w-4 h-4" />
                Restablecer contraseña
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal de cambio de contraseña ── */}
      {passwordPanelOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
          onClick={resetPasswordPanel}
        >
          <form
            onSubmit={handlePasswordChange}
            className="relative w-full max-w-lg rounded-3xl border border-white/60 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl shadow-slate-950/30"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={resetPasswordPanel}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
              aria-label="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="pr-12">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">
                Seguridad de cuenta
              </p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                Restablecer contraseña
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Primero valida tu contraseña actual. Después podrás escribir la nueva contraseña y confirmarla.
              </p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña actual</label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => {
                      setCurrentPassword(event.target.value);
                      setPasswordVerified(false);
                      setPasswordMessage('');
                    }}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Escribe tu contraseña actual"
                  />
                  <button
                    type="button"
                    onClick={handlePasswordVerify}
                    className="rounded-xl border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30 px-4 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                  >
                    Validar
                  </button>
                </div>
              </div>

              <div className={`${passwordVerified ? 'opacity-100' : 'opacity-60'} space-y-4`}>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    disabled={!passwordVerified}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                    placeholder="Escribe la nueva contraseña"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    disabled={!passwordVerified}
                    className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed"
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {passwordVerified ? 'La contraseña actual ya fue validada.' : 'Primero valida la contraseña actual para habilitar esta sección.'}
                  </p>
                  <button
                    type="submit"
                    disabled={!passwordVerified || saving}
                    className="rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400 dark:disabled:bg-slate-600"
                  >
                    Cambiar contraseña
                  </button>
                </div>
              </div>

              {passwordMessage ? (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${
                  passwordVerified
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-400'
                    : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-700/50 dark:bg-purple-900/20 dark:text-purple-300'
                }`}>
                  {passwordMessage}
                </div>
              ) : null}
            </div>
          </form>
        </div>
      ) : null}

      {/* ── Sección de vehículos ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Vehículos asociados
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aquí ves todos los vehículos ligados a tu usuario y puedes crear o editar los que necesites.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          {/* Lista de vehículos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">Lista</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{vehicles.length} vehículo(s) registrados.</p>
              </div>
              <button
                type="button"
                onClick={startNewVehicle}
                className="rounded-lg border border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/30 px-4 py-2 text-sm font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
              >
                Nuevo vehículo
              </button>
            </div>

            {vehicles.length > 0 ? (
              <div className="space-y-3">
                {vehicles.map((item) => {
                  const isSelected = item.vehicle_id === selectedVehicleId;
                  return (
                    <button
                      key={item.vehicle_id ?? `${item.plate_number}-${item.brand}`}
                      type="button"
                      onClick={() => selectVehicle(item)}
                      className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                            {item.plate_number || 'Sin placas'}
                          </h4>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {item.brand || 'Sin marca'} · {item.model || 'Sin modelo'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                            {item.color || 'Sin color'} · {item.year || 'Sin año'} · {item.seats_total} asientos
                          </p>
                        </div>
                        <Car className="h-5 w-5 text-purple-500 dark:text-purple-400 shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/40 p-6 text-sm text-slate-500 dark:text-slate-400">
                Todavía no tienes vehículos registrados. Usa <span className="font-semibold text-slate-700 dark:text-slate-300">Nuevo vehículo</span> para agregar uno.
              </div>
            )}
          </div>

          {/* Formulario de vehículo */}
          <form onSubmit={handleVehicleSave} className="space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {selectedVehicleId ? 'Editar vehículo' : 'Nuevo vehículo'}
              </h3>
              {selectedVehicleId ? (
                <button
                  type="button"
                  onClick={handleVehicleDelete}
                  disabled={vehicleSaving}
                  className="rounded-lg border border-red-200 dark:border-red-700/50 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eliminar
                </button>
              ) : null}
            </div>

            {vehicleMessage ? (
              <div className="rounded-xl border border-purple-200 dark:border-purple-700/50 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 text-sm text-purple-700 dark:text-purple-300">
                {vehicleMessage}
              </div>
            ) : null}

            {[
              { label: 'Número de placas', key: 'plate_number' as const, type: 'text', upper: true },
              { label: 'Marca',            key: 'brand'        as const, type: 'text' },
              { label: 'Modelo',           key: 'model'        as const, type: 'text' },
              { label: 'Color',            key: 'color'        as const, type: 'text' },
            ].map(({ label, key, type, upper }) => (
              <div key={key}>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
                <input
                  type={type}
                  value={vehicleForm[key]}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, [key]: upper ? e.target.value.toUpperCase() : e.target.value })}
                  className={`mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500${upper ? ' uppercase' : ''}`}
                />
              </div>
            ))}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Año</label>
                <input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Total de asientos</label>
                <input
                  type="number"
                  min={1}
                  value={vehicleForm.seats_total}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, seats_total: Number(e.target.value) })}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={startNewVehicle}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Limpiar
              </button>
              <button
                type="submit"
                disabled={vehicleSaving}
                className="flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-3 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {vehicleSaving ? 'Guardando...' : selectedVehicleId ? 'Guardar vehículo' : 'Crear vehículo'}
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
