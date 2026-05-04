import React, { useState } from 'react';
import {
  Camera,
  Car,
  Mail,
  Building2,
  User,
  Save,
  Briefcase,
  Phone,
} from 'lucide-react';

export default function Profile() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [hasCar, setHasCar] = useState(true);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>
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
                Carlos Ruiz
              </h2>
              <p className="text-slate-500">
                UX Designer · Producto Digital
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-8">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nombre
              </label>
              <input
                type="text"
                defaultValue="Carlos"
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Apellido
              </label>
              <input
                type="text"
                defaultValue="Ruiz"
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
                  defaultValue="carlos.ruiz@empresa.com"
                  className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Departamento
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  defaultValue="Producto Digital"
                  className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Building2 className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Puesto
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  defaultValue="UX Designer"
                  className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Briefcase className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Teléfono
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  defaultValue="81 1234 5678"
                  className="w-full px-4 py-3 pl-11 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Phone className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              </div>
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
          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="text-sm font-medium text-slate-700">
                Placas
              </label>
              <input
                type="text"
                defaultValue="ABC-123-D"
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Marca
              </label>
              <input
                type="text"
                defaultValue="Nissan"
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Modelo / color
              </label>
              <input
                type="text"
                defaultValue="Versa gris"
                className="mt-1 w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end mt-8">
          <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4" />
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}