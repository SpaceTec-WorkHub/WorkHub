import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Calendar,
  Car,
  Check,
  Lock,
  Medal,
  PencilLine,
  Search,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  X,
  Users,
  Unlock,
  Trash2,
  Save,
  Monitor,
} from 'lucide-react';
import { isAdminUser, getCurrentUserId } from '../../services/auth';
import {
  createGamificationReward,
  createSpaceBlocks,
  createSpecialEventReservations,
  createUser,
  deleteGamificationReward,
  deleteBlock,
  deleteUser,
  getBlocks,
  getGamificationRewards,
  getRoles,
  getUsers,
  getZones,
  ZoneOption,
  RoleRecord,
  updateBlock,
  BlockRecord,
  updateUser,
  AdminUserRecord,
  updateGamificationReward,
  GamificationRewardPayload,
  GamificationRewardsResponse,
} from '../../services/admin';
import { ApiSpace, getSpace } from '../../services/space';

const toDateTimeLocalValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function Admin() {
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [zoneError, setZoneError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [isAdmin, setIsAdmin] = useState(isAdminUser());
  const [spaces, setSpaces] = useState<ApiSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [spaceError, setSpaceError] = useState('');
  const [spacePickerOpen, setSpacePickerOpen] = useState(false);
  const [spacePickerTab, setSpacePickerTab] = useState<'all' | 'desk' | 'parking'>('all');
  const [spacePickerSearch, setSpacePickerSearch] = useState('');
  const [selectedBlockSpaces, setSelectedBlockSpaces] = useState<ApiSpace[]>([]);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksError, setBlocksError] = useState('');
  const [blockManagerOpen, setBlockManagerOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<number | null>(null);
  const [editingBlockReason, setEditingBlockReason] = useState('');
  const [editingBlockStartTime, setEditingBlockStartTime] = useState('');
  const [editingBlockEndTime, setEditingBlockEndTime] = useState('');
  const [blockActionLoading, setBlockActionLoading] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');

  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyStartTime, setEmergencyStartTime] = useState('');
  const [emergencyIndefinite, setEmergencyIndefinite] = useState(true);
  const [emergencyEndTime, setEmergencyEndTime] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState('');

  const [eventTitle, setEventTitle] = useState('Town hall / evento especial');
  const [eventZoneId, setEventZoneId] = useState<number | null>(null);
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLoading, setEventLoading] = useState(false);
  const [eventMessage, setEventMessage] = useState('');

  const [rewards, setRewards] = useState<GamificationRewardsResponse['rewards']>([]);
  const [rewardsPeriod, setRewardsPeriod] = useState('');
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState('');
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardMessage, setRewardMessage] = useState('');
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState(50);

  const [usuarios, setUsuarios] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userManagerOpen, setUserManagerOpen] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState('');
  const [userType, setUserType] = useState<'internal' | 'external'>('internal');
  const [userStatus, setUserStatus] = useState<'active' | 'inactive'>('active');
  const [password, setPassword] = useState('');

  const isParkingSpace = (space: ApiSpace) => (space.space_type?.name ?? '').toLowerCase().includes('parking');
  const isDeskSpace = (space: ApiSpace) => {
    const name = (space.space_type?.name ?? '').toLowerCase();
    return name.includes('desk') || name.includes('escritorio') || name.includes('escritorios');
  };

  const filteredBlockSpaces = useMemo(() => {
    return spaces.filter((space) => {
      const matchesTab =
        spacePickerTab === 'all' ||
        (spacePickerTab === 'desk' && isDeskSpace(space)) ||
        (spacePickerTab === 'parking' && isParkingSpace(space));
      const matchesSearch =
        spacePickerSearch.trim().length === 0 ||
        `${space.code} ${(space.space_type?.name ?? 'Espacio')} ${space.zone?.name ?? ''}`
          .toLowerCase()
          .includes(spacePickerSearch.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [spacePickerSearch, spacePickerTab, spaces]);

  const toggleBlockSpace = (space: ApiSpace) => {
    setSelectedBlockSpaces((current) => {
      if (current.some((item) => item.space_id === space.space_id)) {
        return current.filter((item) => item.space_id !== space.space_id);
      }

      return [...current, space];
    });
  };

  const cargarUsuarios = async () => {
    setLoadingUsers(true);
    try {
      const data = await getUsers();
      setUsuarios(Array.isArray(data) ? data : []);
      setUsersError('');
    } catch (error) {
      setUsuarios([]);
      setUsersError(error instanceof Error ? error.message : 'No fue posible cargar los usuarios.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const cargarRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await getRoles();
      setRoles(Array.isArray(data) ? data : []);
      setRoleError('');
      setRol((current) => current || String(data[0]?.role_id ?? ''));
    } catch (error) {
      setRoles([]);
      setRoleError(error instanceof Error ? error.message : 'No fue posible cargar los roles.');
    } finally {
      setLoadingRoles(false);
    }
  };

  const abrirVentanaUsuarios = () => {
    setUserManagerOpen(true);
    void cargarUsuarios();
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setNombre('');
    setCorreo('');
    setRol(String(roles[0]?.role_id ?? ''));
    setUserType('internal');
    setUserStatus('active');
    setPassword('');
    setUserMessage('');
  };

  const openUserEditor = (user: AdminUserRecord) => {
    setEditingUserId(user.user_id);
    setNombre(user.full_name ?? '');
    setCorreo(user.email ?? '');
    setRol(String(user.role?.role_id ?? ''));
    setUserType(user.user_type);
    setUserStatus(user.status);
    setPassword('');
    setUserMessage('Editando usuario seleccionado.');
    setUserManagerOpen(true);
  };

  const handleUserSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim() || !correo.trim()) {
      setUserMessage('Completa nombre y correo.');
      return;
    }

    if (!editingUserId && !password.trim()) {
      setUserMessage('La contraseña es obligatoria para crear usuarios.');
      return;
    }

    setUserActionLoading(true);
    setUserMessage('');

    try {
      const payload = {
        full_name: nombre.trim(),
        email: correo.trim(),
        user_type: userType,
        status: userStatus,
        role_id: rol ? Number(rol) : undefined,
        ...(editingUserId ? {} : { password: password.trim() }),
        ...(editingUserId && password.trim() ? { password: password.trim() } : {}),
      };

      if (editingUserId) {
        await updateUser(editingUserId, payload);
        setUserMessage('Usuario actualizado correctamente.');
      } else {
        await createUser(payload as Parameters<typeof createUser>[0]);
        setUserMessage('Usuario creado correctamente.');
      }

      await cargarUsuarios();
      resetUserForm();
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'No fue posible guardar el usuario.');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleUserDelete = async (userId: number) => {
    setUserActionLoading(true);
    setUserMessage('');

    try {
      await deleteUser(userId);
      await cargarUsuarios();
      if (editingUserId === userId) {
        resetUserForm();
      }
      setUserMessage('Usuario eliminado correctamente.');
    } catch (error) {
      setUserMessage(error instanceof Error ? error.message : 'No fue posible eliminar el usuario.');
    } finally {
      setUserActionLoading(false);
    }
  };

  useEffect(() => {
    setIsAdmin(isAdminUser());
  }, []);

  useEffect(() => {
    void cargarRoles();
  }, []);

  useEffect(() => {
    setLoadingZones(true);
    getZones()
      .then((data) => {
        setZones(data);
        setEventZoneId(data[0]?.zone_id ?? null);
        setZoneError('');
      })
      .catch((error) => {
        setZoneError(error instanceof Error ? error.message : 'No fue posible cargar las zonas.');
      })
      .finally(() => setLoadingZones(false));
  }, []);

  useEffect(() => {
    setLoadingSpaces(true);
    getSpace()
      .then((data) => {
        setSpaces(data);
        setSpaceError('');
      })
      .catch((error) => {
        setSpaceError(error instanceof Error ? error.message : 'No fue posible cargar los espacios.');
      })
      .finally(() => setLoadingSpaces(false));
  }, []);

  useEffect(() => {
    setBlocksLoading(true);
    getBlocks()
      .then((data) => {
        setBlocks(data);
        setBlocksError('');
      })
      .catch((error) => {
        setBlocksError(error instanceof Error ? error.message : 'No fue posible cargar los bloqueos.');
      })
      .finally(() => setBlocksLoading(false));
  }, []);

  useEffect(() => {
    setRewardsLoading(true);

    getGamificationRewards()
      .then((rewardState) => {
        setRewards(rewardState.rewards);
        setRewardsPeriod(rewardState.period.label);
        setRewardsError('');
      })
      .catch((error) => {
        setRewardsError(error instanceof Error ? error.message : 'No fue posible cargar los premios quincenales.');
      })
      .finally(() => setRewardsLoading(false));
  }, []);

  const adminSince = useMemo(() => {
    const userId = getCurrentUserId();
    return userId ? `Usuario activo: #${userId}` : 'Sesión administrativa activa';
  }, []);

  const resetRewardForm = () => {
  setEditingRewardId(null);
  setRewardTitle('');
  setRewardDescription('');
  setRewardPoints(50);
  setRewardMessage('');
};

  const refreshRewards = async () => {
    const rewardState = await getGamificationRewards();
    setRewards(rewardState.rewards);
    setRewardsPeriod(rewardState.period.label);
  };

  const refreshBlocks = async () => {
    const data = await getBlocks();
    setBlocks(data);
  };

  const openBlockEditor = (block: BlockRecord) => {
    setEditingBlockId(block.block_id);
    setEditingBlockReason(block.reason);
    setEditingBlockStartTime(toDateTimeLocalValue(block.start_time));
    setEditingBlockEndTime(block.end_time ? toDateTimeLocalValue(block.end_time) : '');
    setBlockMessage('Editando bloqueo seleccionado.');
    setBlockManagerOpen(true);
  };

  const resetBlockEditor = () => {
    setEditingBlockId(null);
    setEditingBlockReason('');
    setEditingBlockStartTime('');
    setEditingBlockEndTime('');
    setBlockMessage('');
  };

  const handleEmergencySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedBlockSpaces.length === 0 || !emergencyReason.trim() || !emergencyStartTime) {
      setEmergencyMessage('Selecciona al menos un espacio, justificación y fecha de inicio.');
      return;
    }

    setEmergencyLoading(true);
    setEmergencyMessage('');

    try {
      const response = await createSpaceBlocks({
        space_ids: selectedBlockSpaces.map((space) => space.space_id),
        reason: emergencyReason.trim(),
        start_time: new Date(emergencyStartTime).toISOString(),
        ...(emergencyIndefinite || !emergencyEndTime
          ? {}
          : { end_time: new Date(emergencyEndTime).toISOString() }),
      });

      setEmergencyMessage(
        `Bloqueo creado. Se bloquearon ${response.blocks.length} espacios y se cancelaron ${response.cancelledReservations} reservas.`,
      );
      setEmergencyReason('');
      setEmergencyStartTime('');
      setEmergencyEndTime('');
      setEmergencyIndefinite(true);
      setSelectedBlockSpaces([]);
      await refreshBlocks();
    } catch (error) {
      setEmergencyMessage(error instanceof Error ? error.message : 'No fue posible crear el bloqueo.');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleBlockSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingBlockId || !editingBlockReason.trim() || !editingBlockStartTime) {
      setBlockMessage('Completa la justificación y la fecha de inicio.');
      return;
    }

    setBlockActionLoading(true);
    setBlockMessage('');

    try {
      await updateBlock(editingBlockId, {
        reason: editingBlockReason.trim(),
        start_time: new Date(editingBlockStartTime).toISOString(),
        ...(editingBlockEndTime ? { end_time: new Date(editingBlockEndTime).toISOString() } : {}),
      });

      await refreshBlocks();
      setBlockMessage('Bloqueo actualizado correctamente.');
      resetBlockEditor();
    } catch (error) {
      setBlockMessage(error instanceof Error ? error.message : 'No fue posible actualizar el bloqueo.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleBlockDelete = async (blockId: number) => {
    setBlockActionLoading(true);
    setBlockMessage('');

    try {
      await deleteBlock(blockId);
      await refreshBlocks();
      if (editingBlockId === blockId) {
        resetBlockEditor();
      }
      setBlockMessage('Bloqueo eliminado correctamente.');
    } catch (error) {
      setBlockMessage(error instanceof Error ? error.message : 'No fue posible eliminar el bloqueo.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventZoneId || !eventDate || !eventStartTime || !eventEndTime) {
      setEventMessage('Completa zona, fecha y horario del evento.');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      setEventMessage('No se encontró la sesión administrativa.');
      return;
    }

    setEventLoading(true);
    setEventMessage('');

    try {
      const response = await createSpecialEventReservations({
        title: eventTitle,
        zone_id: eventZoneId,
        user_id: userId,
        start_time: `${eventDate}T${eventStartTime}:00`,
        end_time: `${eventDate}T${eventEndTime}:00`,
      });

      setEventMessage(
        `Evento creado. ${response.createdReservations} reservas generadas y ${response.cancelledReservations} reservas previas canceladas.`,
      );
      setEventTitle('Town hall / evento especial');
      setEventDate('');
      setEventStartTime('');
      setEventEndTime('');
    } catch (error) {
      setEventMessage(error instanceof Error ? error.message : 'No fue posible crear el evento especial.');
    } finally {
      setEventLoading(false);
    }
  };

  const handleRewardEdit = (reward: GamificationRewardsResponse['rewards'][number]) => {
  setEditingRewardId(reward.gamification_reward_id);
  setRewardTitle(reward.title);
  setRewardDescription(reward.description);
  setRewardPoints(reward.points);
  setRewardMessage('Editando premio seleccionado.');
};

  const handleRewardDelete = async (rewardId: number) => {
    setRewardSaving(true);
    setRewardMessage('');

    try {
      await deleteGamificationReward(rewardId);
      if (editingRewardId === rewardId) {
        resetRewardForm();
      }
      await refreshRewards();
      setRewardMessage('Premio eliminado correctamente.');
    } catch (error) {
      setRewardMessage(error instanceof Error ? error.message : 'No fue posible eliminar el premio.');
    } finally {
      setRewardSaving(false);
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!rewardTitle.trim() || !rewardDescription.trim()) {
    setRewardMessage('Completa título y descripción.');
    return;
  }

  setRewardSaving(true);
  setRewardMessage('');

  const payload: GamificationRewardPayload = {
    title: rewardTitle.trim(),
    description: rewardDescription.trim(),
    points: Number(rewardPoints),
    user_id: getCurrentUserId() ?? 0,
  };

  try {
    if (editingRewardId) {
      await updateGamificationReward(editingRewardId, payload);
      setRewardMessage('Premio actualizado correctamente.');
    } else {
      await createGamificationReward(payload);
      setRewardMessage('Premio creado correctamente.');
    }

    await refreshRewards();
    resetRewardForm();
  } catch (error) {
    setRewardMessage(error instanceof Error ? error.message : 'No fue posible guardar el premio.');
  } finally {
    setRewardSaving(false);
  }
};

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <div className="flex items-center gap-3">
          <ShieldAlert size={22} />
          <div>
            <h1 className="text-lg font-semibold">Acceso restringido</h1>
            <p className="text-sm">Este panel solo está disponible para usuarios administradores.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Panel Administrativo</h1>
          <p className="text-slate-500">Bloqueos de emergencia, eventos especiales y operación de zonas.</p>
          <p className="mt-2 text-xs text-slate-400">{adminSince}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {format(new Date(), 'PPP p')}
        </div>
      </div>

      {zoneError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {zoneError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-red-600">
            <Lock size={20} />
            <h2 className="font-semibold">Bloqueo de emergencia</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Bloquea uno o varios espacios por remodelación, mantenimiento o cualquier caso indefinido.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleEmergencySubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Espacios</label>
              <button
                type="button"
                onClick={() => setSpacePickerOpen(true)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <span>{selectedBlockSpaces.length > 0 ? `${selectedBlockSpaces.length} espacio(s) seleccionados` : 'Seleccionar espacios a bloquear'}</span>
                <span className="text-slate-400">Abrir</span>
              </button>
              {selectedBlockSpaces.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedBlockSpaces.map((space) => (
                    <button
                      key={space.space_id}
                      type="button"
                      onClick={() => toggleBlockSpace(space)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700"
                    >
                      {space.code}
                      <X size={12} />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Justificación</label>
              <textarea
                value={emergencyReason}
                onChange={(event) => setEmergencyReason(event.target.value)}
                rows={4}
                placeholder="Ej. Remodelación del piso 4 hasta nuevo aviso"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio del bloqueo</label>
              <input
                type="datetime-local"
                value={emergencyStartTime}
                onChange={(event) => setEmergencyStartTime(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={emergencyIndefinite}
                onChange={(event) => setEmergencyIndefinite(event.target.checked)}
              />
              Bloqueo indefinido
            </label>
            {!emergencyIndefinite ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin del bloqueo</label>
                <input
                  type="datetime-local"
                  value={emergencyEndTime}
                  onChange={(event) => setEmergencyEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            ) : null}
            <button
              type="submit"
              disabled={emergencyLoading || loadingSpaces || selectedBlockSpaces.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <AlertTriangle size={16} />
              {emergencyLoading ? 'Creando bloqueo...' : 'Crear bloqueo de emergencia'}
            </button>
            <button
              type="button"
              onClick={() => setBlockManagerOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Lock size={16} />
              Administrar bloqueos
            </button>
          </form>
          {emergencyMessage ? <p className="mt-4 text-sm text-slate-600">{emergencyMessage}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-blue-600">
            <Sparkles size={20} />
            <h2 className="font-semibold">Evento especial</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Reserva en masa todos los espacios disponibles de una zona para una ventana horaria definida.
          </p>
          <form className="mt-5 space-y-4" onSubmit={handleEventSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Zona</label>
              <select
                value={eventZoneId ?? ''}
                onChange={(event) => setEventZoneId(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                disabled={loadingZones}
              >
                {zones.map((zone) => (
                  <option key={zone.zone_id} value={zone.zone_id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fecha</label>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio</label>
                <input
                  type="time"
                  value={eventStartTime}
                  onChange={(event) => setEventStartTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin</label>
                <input
                  type="time"
                  value={eventEndTime}
                  onChange={(event) => setEventEndTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={eventLoading || loadingZones}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Calendar size={16} />
              {eventLoading ? 'Creando evento...' : 'Crear evento especial'}
            </button>
          </form>
          {eventMessage ? <p className="mt-4 text-sm text-slate-600">{eventMessage}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Unlock size={20} />
            <h2 className="font-semibold">Gestión de usuarios</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            E
          </p>
          <button className="mt-5 w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
            Ver usuarios
          </button>
        </div>
      </div>

      {spacePickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Seleccionar espacios a bloquear</h3>
                <p className="mt-1 text-sm text-slate-500">Elige uno o varios espacios, luego confirma para volver al formulario.</p>
              </div>
              <button
                type="button"
                onClick={() => setSpacePickerOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-1 min-h-0 gap-6 p-6">
              <div className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex rounded-2xl bg-white p-1 shadow-sm dark:bg-slate-900">
                    {[
                      { id: 'all' as const, label: 'Todos' },
                      { id: 'desk' as const, label: 'Desk' },
                      { id: 'parking' as const, label: 'Parking' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSpacePickerTab(tab.id)}
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                          spacePickerTab === tab.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus-within:border-blue-500 dark:border-slate-700 dark:bg-slate-900">
                    <Search size={16} className="text-slate-400" />
                    <input
                      value={spacePickerSearch}
                      onChange={(event) => setSpacePickerSearch(event.target.value)}
                      placeholder="Buscar espacio o zona..."
                      className="w-full bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </label>
                </div>

                {loadingSpaces ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cargando espacios...
                  </div>
                ) : spaceError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {spaceError}
                  </div>
                ) : (
                  <div className="grid max-h-[calc(90vh-15rem)] grid-cols-2 gap-4 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
                    {filteredBlockSpaces.map((space) => {
                      const selected = selectedBlockSpaces.some((item) => item.space_id === space.space_id);
                      const isParking = isParkingSpace(space);
                      return (
                        <button
                          key={space.space_id}
                          type="button"
                          onClick={() => toggleBlockSpace(space)}
                          className={`flex min-h-[120px] flex-col justify-between rounded-2xl border p-4 text-left shadow-sm transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/30'
                              : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {isParking ? 'Parking' : 'Desk'}
                              </p>
                              <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{space.code}</h4>
                              <p className="mt-1 text-sm text-slate-500">{space.zone?.name ?? 'Sin zona'}</p>
                            </div>
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              {selected ? <Check size={14} /> : '•'}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-medium">
                            {space.is_accessible ? (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">Accesible</span>
                            ) : null}
                            {space.is_priority ? (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Prioritario</span>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                    {filteredBlockSpaces.length === 0 ? (
                      <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                        No hay espacios que coincidan con el filtro actual.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <aside className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="mb-4 flex items-center gap-2 text-slate-700 dark:text-slate-200">
                  <Monitor size={18} />
                  <h4 className="font-semibold">Selección actual</h4>
                </div>

                {selectedBlockSpaces.length > 0 ? (
                  <div className="space-y-3">
                    {selectedBlockSpaces.map((space) => (
                      <div key={space.space_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{space.code}</p>
                          <p className="text-xs text-slate-500">{space.zone?.name ?? 'Sin zona'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBlockSpace(space)}
                          className="rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                    No has seleccionado espacios todavía.
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBlockSpaces([]);
                      setSpacePickerOpen(false);
                    }}
                    className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpacePickerOpen(false)}
                    className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Listo
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {blockManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Administrar bloqueos</h3>
                <p className="mt-1 text-sm text-slate-500">Edita horarios o elimina bloqueos existentes.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBlockManagerOpen(false);
                  resetBlockEditor();
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Bloqueos actuales</h4>
                    <p className="text-sm text-slate-500">{blocks.length} bloqueo(s) registrados.</p>
                  </div>
                </div>

                {blocksLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cargando bloqueos...
                  </div>
                ) : blocksError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {blocksError}
                  </div>
                ) : (
                  <div className="max-h-[calc(90vh-15rem)] space-y-3 overflow-y-auto pr-1">
                    {blocks.map((block) => {
                      const targetLabel = block.space?.code ?? block.zone?.name ?? `Bloqueo #${block.block_id}`;
                      return (
                        <div key={block.block_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">Bloqueo</span>
                                <span>{block.space_id ? 'Espacio' : 'Zona'}</span>
                              </div>
                              <h5 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{targetLabel}</h5>
                              <p className="mt-1 text-sm text-slate-500">{block.reason}</p>
                              <p className="mt-2 text-xs text-slate-400">
                                {format(new Date(block.start_time), 'PPp')}
                                {block.end_time ? ` - ${format(new Date(block.end_time), 'PPp')}` : ' - indefinido'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openBlockEditor(block)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <PencilLine size={16} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleBlockDelete(block.block_id)}
                                disabled={blockActionLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {blocks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                        Todavía no hay bloqueos registrados.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingBlockId ? 'Editar bloqueo' : 'Selecciona un bloqueo'}
                </h4>
                <p className="mt-1 text-sm text-slate-500">Modifica la justificación y el horario del bloqueo seleccionado.</p>

                {editingBlockId ? (
                  <form className="mt-5 space-y-4" onSubmit={handleBlockSave}>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Justificación</label>
                      <textarea
                        value={editingBlockReason}
                        onChange={(event) => setEditingBlockReason(event.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio</label>
                      <input
                        type="datetime-local"
                        value={editingBlockStartTime}
                        onChange={(event) => setEditingBlockStartTime(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin</label>
                      <input
                        type="datetime-local"
                        value={editingBlockEndTime}
                        onChange={(event) => setEditingBlockEndTime(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    {blockMessage ? (
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                        {blockMessage}
                      </div>
                    ) : null}
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetBlockEditor}
                        className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        Limpiar
                      </button>
                      <button
                        type="submit"
                        disabled={blockActionLoading}
                        className="flex-1 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                    Elige un bloqueo de la lista para editarlo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 text-purple-600">
              <Medal size={20} />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Premios quincenales</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {rewardsPeriod ? `Premios registrados para ${rewardsPeriod}.` : 'Premios registrados por quincena.'}
            </p>
          </div>
          <button
            type="button"
            onClick={resetRewardForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <RotateCcw size={16} />
            Nuevo premio
          </button>
        </div>

        {rewardsError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rewardsError}
          </div>
        ) : null}

        {rewardMessage ? (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {rewardMessage}
          </div>
        ) : null}

        {rewardsLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Cargando premios quincenales...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
                Premios actuales ({rewards.length})
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {rewards.length > 0 ? (
                  rewards.map((reward) => (
                    <div key={reward.gamification_reward_id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-white">{reward.title}</span>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            +{reward.points}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{reward.description}</p>
                        <p className="text-xs text-slate-400">Premio</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRewardEdit(reward)}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <PencilLine size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRewardDelete(reward.gamification_reward_id)}
                          disabled={rewardSaving}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                          Borrar
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-slate-500">
                    Aún no hay premios para esta quincena.
                  </div>
                )}
              </div>
            </div>

            <form className="space-y-4 rounded-2xl border border-slate-200 p-5 dark:border-slate-700" onSubmit={handleRewardSubmit}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingRewardId ? 'Editar premio' : 'Nuevo premio'}
                </h3>
                <span className="text-xs text-slate-400">Premio</span>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
                <input
                  value={rewardTitle}
                  onChange={(event) => setRewardTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Premio quincenal"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                <textarea
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Describe por qué se entrega el premio"
                />
              </div>

              {editingRewardId ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Puntos</label>
                  <input
                    type="number"
                    value={rewardPoints}
                    onChange={(event) => setRewardPoints(Number(event.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                  Se guardará como premio informativo de la sesión actual.
                </div>
              )}

              <button
                type="submit"
                disabled={rewardSaving || rewardsLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save size={16} />
                {rewardSaving ? 'Guardando...' : editingRewardId ? 'Actualizar premio' : 'Crear premio'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 mb-2">
          <Users size={20} />
          <h4 className="font-semibold">Gestión de Usuarios</h4>
        </div>
        <p className="text-xs text-slate-500 mb-3">Administra usuarios registrados, crea nuevos y abre el panel completo.</p>
        <button
          className="w-full py-2 bg-slate-700 text-white text-xs font-bold rounded hover:bg-slate-800 transition-colors"
          onClick={() => abrirVentanaUsuarios()}
          type="button"
        >
          Administrar usuarios
        </button>
      </div>

      {userManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Gestión de usuarios</h3>
                <p className="mt-1 text-sm text-slate-500">Crea, edita o elimina usuarios desde este panel.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserManagerOpen(false);
                  resetUserForm();
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">Usuarios registrados</h4>
                    <p className="text-sm text-slate-500">{usuarios.length} usuario(s) cargados.</p>
                  </div>
                </div>

                {loadingUsers ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cargando usuarios...
                  </div>
                ) : usersError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {usersError}
                  </div>
                ) : (
                  <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[50vh] lg:max-h-[calc(100dvh-18rem)]">
                    {usuarios.map((user) => (
                      <div key={user.user_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-700">Usuario</span>
                              <span>{user.status}</span>
                            </div>
                            <h5 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{user.full_name ?? 'Sin nombre'}</h5>
                            <p className="mt-1 text-sm text-slate-500">{user.email ?? 'Sin correo'}</p>
                            <p className="mt-2 text-xs text-slate-400">
                              {user.user_type} · {user.role?.name ?? 'Sin rol'}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                            <button
                              type="button"
                              onClick={() => openUserEditor(user)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <PencilLine size={16} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUserDelete(user.user_id)}
                              disabled={userActionLoading}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {usuarios.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                        Todavía no hay usuarios registrados.
                      </div>
                    ) : null}
                  </div>
                )}
                {roleError ? <p className="mt-3 text-xs text-red-600">{roleError}</p> : null}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {editingUserId ? 'Editar usuario' : 'Nuevo usuario'}
                </h4>
                <p className="mt-1 text-sm text-slate-500">Completa los datos para crear o actualizar un usuario.</p>

                <form className="mt-5 space-y-4" onSubmit={handleUserSave}>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre completo</label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Correo electrónico</label>
                    <input
                      type="email"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUserId ? 'Dejar vacío para no cambiarla' : 'Contraseña inicial'}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                      <select
                        value={userType}
                        onChange={(e) => setUserType(e.target.value as 'internal' | 'external')}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                      <select
                        value={userStatus}
                        onChange={(e) => setUserStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Rol</label>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      value={rol}
                      onChange={(e) => setRol(e.target.value)}
                      disabled={loadingRoles || roles.length === 0}
                    >
                      <option value="">Selecciona un rol</option>
                      {roles.map((role) => (
                        <option key={role.role_id} value={role.role_id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {userMessage ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                      {userMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={resetUserForm}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900 sm:flex-1"
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      disabled={userActionLoading}
                      className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:flex-1"
                    >
                      {editingUserId ? 'Guardar cambios' : 'Crear usuario'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
