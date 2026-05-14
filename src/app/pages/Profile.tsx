import React, { useEffect, useState } from 'react';
import {
  Camera,
  Car,
  Mail,
  User,
  Save,
  KeyRound,
} from 'lucide-react';

import { getStoredSession, isAdminUser } from '../../services/auth';
const API_URL = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env.VITE_API_URL ?? '';


type ProfileData = {
  full_name: string;
  email: string;
};

type VehicleData = {
  vehicle_id: number | null;
  plate_number: string;
  brand: string;
  model: string;
  color: string;
  year: string;
  seats_total: number;
};

export default function Profile() {
  const [photo, setPhoto] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    email: '',
  });

  const [vehicle, setVehicle] = useState<VehicleData>({
    vehicle_id: null,
    plate_number: '',
    brand: '',
    model: '',
    color: '',
    year: '',
    seats_total: 5,
  });

  const [hasCar, setHasCar] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function getCurrentSessionUser() {
    const session = getStoredSession();

    const user = session?.user as { user_id?: number } | undefined;

    return {
      userId: user?.user_id ?? null,
      isAdmin: isAdminUser(),
      //token: session?.token ?? null,
    };
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { userId} = getCurrentSessionUser();

        if (!userId) {
          return;
        }

        // USER
        const userResponse = await fetch(
          `${API_URL}/users/${userId}`
        );

        if (!userResponse.ok) {
          throw new Error('Failed to fetch user');
        }

        const user = await userResponse.json();

        setProfile({
          full_name: user.full_name || '',
          email: user.email || '',
        });

        // VEHICLE
        const vehicleResponse = await fetch(
          `${API_URL}/vehicle/owner/${userId}`
        );

        if (vehicleResponse.ok) {
          const existingVehicle = await vehicleResponse.json();

          setVehicle({
            vehicle_id: existingVehicle.vehicle_id,
            plate_number: existingVehicle.plate_number || '',
            brand: existingVehicle.brand || '',
            model: existingVehicle.model || '',
            color: existingVehicle.color || '',
            year: existingVehicle.year
              ? String(existingVehicle.year)
              : '',
            seats_total: existingVehicle.seats_total || 5,
          });

          setHasCar(true);
        }
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

      const { userId, token } = getCurrentSessionUser();

      if (!userId) {
        return;
      }

      // UPDATE USER
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

      // VEHICLE
      if (hasCar) {
        const vehiclePayload = {
          plate_number: vehicle.plate_number,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color,
          year: vehicle.year ? Number(vehicle.year) : undefined,
          seats_total: Number(vehicle.seats_total),
          owner_id: userId,
        };

        if (vehicle.vehicle_id) {
          // UPDATE VEHICLE
          const updateVehicleResponse = await fetch(
            `${API_URL}/vehicle/${vehicle.vehicle_id}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(vehiclePayload),
            },
          );

          if (!updateVehicleResponse.ok) {
            throw new Error('Failed to update vehicle');
          }
        } else {
          // CREATE VEHICLE
          const createVehicleResponse = await fetch(
            `${API_URL}/vehicles`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(vehiclePayload),
            },
          );

          if (!createVehicleResponse.ok) {
            throw new Error('Failed to create vehicle');
          }
        }
      }

      alert('Perfil actualizado correctamente');
    } catch (error) {
      console.error(error);
      alert('Error actualizando perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-slate-500">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Mi perfil
        </h1>

        <p className="text-slate-500 mt-1">
          Aquí puedes revisar y actualizar tu información personal.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-blue-600" />

        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-14">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-slate-100 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                {photo ? (
                  <img
                    src={photo}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <label className="absolute bottom-1 right-1 w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-blue-700">
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
              <h2 className="text-xl font-bold text-slate-900">
                {profile.full_name || 'Usuario'}
              </h2>

              <p className="text-slate-500">
                Usuario WorkHub MTY
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-8">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nombre completo
              </label>

              <input
                type="text"
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    full_name: e.target.value,
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Correo
              </label>

              <div className="relative mt-1">
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>

              <button
                type="button"
                className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <KeyRound className="w-4 h-4" />
                Restablecer contraseña
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-blue-600" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Datos del vehículo
            </h2>

            <p className="text-sm text-slate-500">
              Esta información se usa para reservas de estacionamiento.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 mb-6 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={hasCar}
            onChange={() => setHasCar(!hasCar)}
            className="w-4 h-4"
          />

          Tengo carro
        </label>

        {hasCar && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Número de placas
              </label>

              <input
                type="text"
                value={vehicle.plate_number}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    plate_number: e.target.value.toUpperCase(),
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Marca
              </label>

              <input
                type="text"
                value={vehicle.brand}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    brand: e.target.value,
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Modelo
              </label>

              <input
                type="text"
                value={vehicle.model}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    model: e.target.value,
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Color
              </label>

              <input
                type="text"
                value={vehicle.color}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    color: e.target.value,
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Año
              </label>

              <input
                type="number"
                value={vehicle.year}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    year: e.target.value,
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Total de asientos
              </label>

              <input
                type="number"
                min={1}
                value={vehicle.seats_total}
                onChange={(e) =>
                  setVehicle({
                    ...vehicle,
                    seats_total: Number(e.target.value),
                  })
                }
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-8">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />

            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}