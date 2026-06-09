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
import { useToast } from '../components/feedback/ToastProvider';
import { useConfirm } from '../components/feedback/ConfirmProvider';
import {
  createGamificationReward,
  createBuilding,
  createFloor,
  createSpace,
  createZone,
  createSpaceBlocks,
  createSpecialEventReservations,
  createUser,
  cancelEvent,
  createUserNeed,
  deleteBuilding,
  deleteFloor,
  deleteGamificationReward,
  deleteBlock,
  deleteSpace,
  deleteZone,
  deleteUser,
  deleteUserNeed,
  getAdminBuildings,
  getAdminFloors,
  getEvents,
  getAdminSpaces,
  getAdminZones,
  getBlocks,
  getGamificationRewards,
  getRoles,
  getPriorityLevels,
  getSites,
  getSpaceTypes,
  getUserNeeds,
  getUsers,
  getZones,
  AdminBuildingRecord,
  AdminFloorRecord,
  AdminSiteRecord,
  AdminSpaceRecord,
  AdminSpaceTypeRecord,
  AdminZoneRecord,
  EventPayload,
  EventRecord,
  EventStatus,
  PriorityLevelRecord,
  ZoneOption,
  RoleRecord,
  updateBuilding,
  updateFloor,
  updateSpace,
  updateZone,
  updateBlock,
  updateEvent,
  updateUserNeed,
  BlockRecord,
  updateUser,
  AdminUserRecord,
  updateGamificationReward,
  GamificationRewardPayload,
  GamificationRewardsResponse,
  UserNeedRecord,
} from '../../services/admin';
import { ApiSpace, getSpace } from '../../services/space';

const toDateTimeLocalValue = (value: string | Date) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const eventStatusOptions: Array<{ value: EventStatus; label: string }> = [
  { value: 'planned', label: 'Planeado' },
  { value: 'ongoing', label: 'En curso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

export default function Admin() {
  const toast = useToast();
  const { confirm } = useConfirm();
  const [zones, setZones] = useState<ZoneOption[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [sites, setSites] = useState<AdminSiteRecord[]>([]);
  const [hierarchyBuildings, setHierarchyBuildings] = useState<AdminBuildingRecord[]>([]);
  const [hierarchyFloors, setHierarchyFloors] = useState<AdminFloorRecord[]>([]);
  const [hierarchyZones, setHierarchyZones] = useState<AdminZoneRecord[]>([]);
  const [hierarchySpaces, setHierarchySpaces] = useState<AdminSpaceRecord[]>([]);
  const [spaceTypes, setSpaceTypes] = useState<AdminSpaceTypeRecord[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingHierarchy, setLoadingHierarchy] = useState(true);
  const [zoneError, setZoneError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [hierarchyError, setHierarchyError] = useState('');
  const [isAdmin, setIsAdmin] = useState(isAdminUser());
  const [spaces, setSpaces] = useState<ApiSpace[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [spaceError, setSpaceError] = useState('');
  const [hierarchyManagerOpen, setHierarchyManagerOpen] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<number | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [buildingSiteId, setBuildingSiteId] = useState('');
  const [editingFloorId, setEditingFloorId] = useState<number | null>(null);
  const [floorName, setFloorName] = useState('');
  const [floorBuildingId, setFloorBuildingId] = useState('');
  const [floorType, setFloorType] = useState<'office' | 'parking'>('office');
  const [editingZoneId, setEditingZoneId] = useState<number | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFloorId, setZoneFloorId] = useState('');
  const [editingSpaceId, setEditingSpaceId] = useState<number | null>(null);
  const [spaceCode, setSpaceCode] = useState('');
  const [spaceZoneId, setSpaceZoneId] = useState('');
  const [spaceTypeId, setSpaceTypeId] = useState('');
  const [spaceStatus, setSpaceStatus] = useState<'available' | 'occupied' | 'maintenance' | 'blocked'>('available');
  const [spaceAccessible, setSpaceAccessible] = useState(false);
  const [spacePriority, setSpacePriority] = useState(false);
  const [hierarchyActionLoading, setHierarchyActionLoading] = useState(false);
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

  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyStartTime, setEmergencyStartTime] = useState('');
  const [emergencyIndefinite, setEmergencyIndefinite] = useState(true);
  const [emergencyEndTime, setEmergencyEndTime] = useState('');
  const [emergencyLoading, setEmergencyLoading] = useState(false);

  const [eventTitle, setEventTitle] = useState('Town hall / evento especial');
  const [eventZoneId, setEventZoneId] = useState<number | null>(null);
  const [eventUserNeedId, setEventUserNeedId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStartTime, setEventStartTime] = useState('');
  const [eventEndTime, setEventEndTime] = useState('');
  const [eventLoading, setEventLoading] = useState(false);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');
  const [eventManagerOpen, setEventManagerOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [managedEventTitle, setManagedEventTitle] = useState('');
  const [managedEventDescription, setManagedEventDescription] = useState('');
  const [managedEventLocation, setManagedEventLocation] = useState('');
  const [managedEventUserNeedId, setManagedEventUserNeedId] = useState('');
  const [managedEventStartTime, setManagedEventStartTime] = useState('');
  const [managedEventEndTime, setManagedEventEndTime] = useState('');
  const [managedEventExpectedAttendees, setManagedEventExpectedAttendees] = useState('');
  const [managedEventStatus, setManagedEventStatus] = useState<EventStatus>('planned');
  const [eventManagerLoading, setEventManagerLoading] = useState(false);
  const [userNeeds, setUserNeeds] = useState<UserNeedRecord[]>([]);
  const [userNeedsLoading, setUserNeedsLoading] = useState(true);
  const [userNeedsError, setUserNeedsError] = useState('');
  const [priorityLevels, setPriorityLevels] = useState<PriorityLevelRecord[]>([]);
  const [userNeedManagerOpen, setUserNeedManagerOpen] = useState(false);
  const [editingUserNeedId, setEditingUserNeedId] = useState<number | null>(null);
  const [managedUserNeedType, setManagedUserNeedType] = useState('');
  const [managedUserNeedReason, setManagedUserNeedReason] = useState('');
  const [managedUserNeedStartDate, setManagedUserNeedStartDate] = useState('');
  const [managedUserNeedEndDate, setManagedUserNeedEndDate] = useState('');
  const [managedUserNeedStatus, setManagedUserNeedStatus] = useState<'active' | 'inactive' | 'expired'>('active');
  const [managedUserNeedUserId, setManagedUserNeedUserId] = useState('');
  const [managedUserNeedPriorityLevelId, setManagedUserNeedPriorityLevelId] = useState('');
  const [userNeedManagerLoading, setUserNeedManagerLoading] = useState(false);

  const [rewards, setRewards] = useState<GamificationRewardsResponse['rewards']>([]);
  const [rewardsPeriod, setRewardsPeriod] = useState('');
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState('');
  const [rewardSaving, setRewardSaving] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState<number | null>(null);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardPoints, setRewardPoints] = useState(50);

  const [usuarios, setUsuarios] = useState<AdminUserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [userManagerOpen, setUserManagerOpen] = useState(false);
  const [userActionLoading, setUserActionLoading] = useState(false);
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

  const refreshHierarchy = async () => {
    setLoadingHierarchy(true);

    try {
      const [siteData, buildingData, floorData, zoneData, spaceData, spaceTypeData] = await Promise.all([
        getSites(),
        getAdminBuildings(),
        getAdminFloors(),
        getAdminZones(),
        getAdminSpaces(),
        getSpaceTypes(),
      ]);

      setSites(siteData ?? []);
      setHierarchyBuildings(buildingData ?? []);
      setHierarchyFloors(floorData ?? []);
      setHierarchyZones(zoneData ?? []);
      setHierarchySpaces(spaceData ?? []);
      setSpaceTypes(spaceTypeData ?? []);
      setHierarchyError('');
    } catch (error) {
      setHierarchyError(error instanceof Error ? error.message : 'No fue posible cargar la jerarquía de espacios.');
      setSites([]);
      setHierarchyBuildings([]);
      setHierarchyFloors([]);
      setHierarchyZones([]);
      setHierarchySpaces([]);
      setSpaceTypes([]);
    } finally {
      setLoadingHierarchy(false);
    }
  };

  const resetBuildingForm = () => {
    setEditingBuildingId(null);
    setBuildingName('');
    setBuildingSiteId(String(sites[0]?.site_id ?? ''));
  };

  const resetFloorForm = () => {
    setEditingFloorId(null);
    setFloorName('');
    setFloorBuildingId(String(hierarchyBuildings[0]?.building_id ?? ''));
    setFloorType('office');
  };

  const resetZoneForm = () => {
    setEditingZoneId(null);
    setZoneName('');
    setZoneFloorId(String(hierarchyFloors[0]?.floor_id ?? ''));
  };

  const resetSpaceForm = () => {
    setEditingSpaceId(null);
    setSpaceCode('');
    setSpaceZoneId(String(hierarchyZones[0]?.zone_id ?? ''));
    setSpaceTypeId(String(spaceTypes[0]?.space_type_id ?? ''));
    setSpaceStatus('available');
    setSpaceAccessible(false);
    setSpacePriority(false);
  };

  const openBuildingEditor = (building: AdminBuildingRecord) => {
    setEditingBuildingId(building.building_id);
    setBuildingName(building.name);
    setBuildingSiteId(String(building.site_id));
    setHierarchyManagerOpen(true);
    toast.info('Editando edificio seleccionado.');
  };

  const openFloorEditor = (floor: AdminFloorRecord) => {
    setEditingFloorId(floor.floor_id);
    setFloorName(floor.name);
    setFloorBuildingId(String(floor.building_id));
    setFloorType(floor.floor_type);
    setHierarchyManagerOpen(true);
    toast.info('Editando piso seleccionado.');
  };

  const openZoneEditor = (zone: AdminZoneRecord) => {
    setEditingZoneId(zone.zone_id);
    setZoneName(zone.name);
    setZoneFloorId(String(zone.floor_id));
    setHierarchyManagerOpen(true);
    toast.info('Editando zona seleccionada.');
  };

  const openSpaceEditor = (space: AdminSpaceRecord) => {
    setEditingSpaceId(space.space_id);
    setSpaceCode(space.code);
    setSpaceZoneId(String(space.zone_id));
    setSpaceTypeId(String(space.space_type_id ?? space.space_type?.space_type_id ?? ''));
    setSpaceStatus(space.status);
    setSpaceAccessible(space.is_accessible);
    setSpacePriority(space.is_priority);
    setHierarchyManagerOpen(true);
    toast.info('Editando espacio seleccionado.');
  };

  const openHierarchyManager = () => {
    setHierarchyManagerOpen(true);
    if (!sites.length || !hierarchyBuildings.length || !hierarchyFloors.length || !hierarchyZones.length || !spaceTypes.length) {
      void refreshHierarchy();
    }
    setBuildingSiteId((current) => current || String(sites[0]?.site_id ?? ''));
    setFloorBuildingId((current) => current || String(hierarchyBuildings[0]?.building_id ?? ''));
    setZoneFloorId((current) => current || String(hierarchyFloors[0]?.floor_id ?? ''));
    setSpaceZoneId((current) => current || String(hierarchyZones[0]?.zone_id ?? ''));
    setSpaceTypeId((current) => current || String(spaceTypes[0]?.space_type_id ?? ''));
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
  };

  const openUserEditor = (user: AdminUserRecord) => {
    setEditingUserId(user.user_id);
    setNombre(user.full_name ?? '');
    setCorreo(user.email ?? '');
    setRol(String(user.role?.role_id ?? ''));
    setUserType(user.user_type);
    setUserStatus(user.status);
    setPassword('');
    toast.info('Editando usuario seleccionado.');
    setUserManagerOpen(true);
  };

  const handleUserSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim() || !correo.trim()) {
      toast.error('Completa nombre y correo.');
      return;
    }

    if (!editingUserId && !password.trim()) {
      toast.error('La contraseña es obligatoria para crear usuarios.');
      return;
    }

    setUserActionLoading(true);

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
        toast.success('Usuario actualizado correctamente.');
      } else {
        await createUser(payload as Parameters<typeof createUser>[0]);
        toast.success('Usuario creado correctamente.');
      }

      await cargarUsuarios();
      resetUserForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el usuario.');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleUserDelete = async (userId: number) => {
    setUserActionLoading(true);

    try {
      await deleteUser(userId);
      await cargarUsuarios();
      if (editingUserId === userId) {
        resetUserForm();
      }
      toast.success('Usuario eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el usuario.');
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
    setEventsLoading(true);
    getEvents()
      .then((data) => {
        setEvents(data);
        setEventsError('');
      })
      .catch((error) => {
        setEvents([]);
        setEventsError(error instanceof Error ? error.message : 'No fue posible cargar los eventos.');
      })
      .finally(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    setUserNeedsLoading(true);
    getUserNeeds()
      .then((data) => {
        setUserNeeds(data);
        setUserNeedsError('');
        setEventUserNeedId((current) => current || String(data[0]?.user_need_id ?? ''));
        setManagedEventUserNeedId((current) => current || String(data[0]?.user_need_id ?? ''));
      })
      .catch((error) => {
        setUserNeeds([]);
        setUserNeedsError(error instanceof Error ? error.message : 'No fue posible cargar los user needs.');
      })
      .finally(() => setUserNeedsLoading(false));
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

  useEffect(() => {
    void refreshHierarchy();
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

  const refreshEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const refreshPriorityLevels = async () => {
    const data = await getPriorityLevels();
    setPriorityLevels(data);
    return data;
  };

  const resetEventForm = () => {
    setEditingEventId(null);
    setManagedEventTitle('');
    setManagedEventDescription('');
    setManagedEventLocation('');
    setManagedEventUserNeedId(String(userNeeds[0]?.user_need_id ?? ''));
    setManagedEventStartTime('');
    setManagedEventEndTime('');
    setManagedEventExpectedAttendees('');
    setManagedEventStatus('planned');
  };

  const resetUserNeedForm = () => {
    setEditingUserNeedId(null);
    setManagedUserNeedType('');
    setManagedUserNeedReason('');
    setManagedUserNeedStartDate('');
    setManagedUserNeedEndDate('');
    setManagedUserNeedStatus('active');
    setManagedUserNeedUserId(String(usuarios[0]?.user_id ?? ''));
    setManagedUserNeedPriorityLevelId(String(priorityLevels[0]?.priority_level_id ?? ''));
  };

  const openEventEditor = (eventRecord: EventRecord) => {
    setEditingEventId(eventRecord.event_id);
    setManagedEventTitle(eventRecord.title);
    setManagedEventDescription(eventRecord.description ?? '');
    setManagedEventLocation(eventRecord.location ?? '');
    setManagedEventUserNeedId(String(eventRecord.user_need_id));
    setManagedEventStartTime(toDateTimeLocalValue(eventRecord.start_time));
    setManagedEventEndTime(toDateTimeLocalValue(eventRecord.end_time));
    setManagedEventExpectedAttendees(
      eventRecord.expected_attendees !== null && eventRecord.expected_attendees !== undefined
        ? String(eventRecord.expected_attendees)
        : '',
    );
    setManagedEventStatus(eventRecord.status);
    toast.info('Editando evento seleccionado.');
    setEventManagerOpen(true);
  };

  const openUserNeedEditor = (userNeed: UserNeedRecord) => {
    setEditingUserNeedId(userNeed.user_need_id);
    setManagedUserNeedType(userNeed.need_type);
    setManagedUserNeedReason(userNeed.reason);
    setManagedUserNeedStartDate(toDateTimeLocalValue(userNeed.start_date));
    setManagedUserNeedEndDate(toDateTimeLocalValue(userNeed.end_date));
    setManagedUserNeedStatus(userNeed.status);
    setManagedUserNeedUserId(String(userNeed.user?.user_id ?? ''));
    setManagedUserNeedPriorityLevelId(String(userNeed.priorityLevel?.priority_level_id ?? ''));
    toast.info('Editando necesidad seleccionada.');
    setUserNeedManagerOpen(true);
  };

  const handleBuildingSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!buildingName.trim() || !buildingSiteId) {
      toast.error('Completa el nombre del edificio y el site padre.');
      return;
    }

    setHierarchyActionLoading(true);

    try {
      const payload = { name: buildingName.trim(), site_id: Number(buildingSiteId) };

      if (editingBuildingId) {
        await updateBuilding(editingBuildingId, payload);
        toast.success('Edificio actualizado correctamente.');
      } else {
        await createBuilding(payload);
        toast.success('Edificio creado correctamente.');
      }

      await refreshHierarchy();
      resetBuildingForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el edificio.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleBuildingDelete = async (buildingId: number) => {
    setHierarchyActionLoading(true);

    try {
      await deleteBuilding(buildingId);
      await refreshHierarchy();
      if (editingBuildingId === buildingId) {
        resetBuildingForm();
      }
      toast.success('Edificio eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el edificio.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleFloorSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!floorName.trim() || !floorBuildingId) {
      toast.error('Completa el nombre del piso y su edificio padre.');
      return;
    }

    setHierarchyActionLoading(true);

    try {
      const payload = { name: floorName.trim(), building_id: Number(floorBuildingId), floor_type: floorType };

      if (editingFloorId) {
        await updateFloor(editingFloorId, payload);
        toast.success('Piso actualizado correctamente.');
      } else {
        await createFloor(payload);
        toast.success('Piso creado correctamente.');
      }

      await refreshHierarchy();
      resetFloorForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el piso.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleFloorDelete = async (floorId: number) => {
    setHierarchyActionLoading(true);

    try {
      await deleteFloor(floorId);
      await refreshHierarchy();
      if (editingFloorId === floorId) {
        resetFloorForm();
      }
      toast.success('Piso eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el piso.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleZoneSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!zoneName.trim() || !zoneFloorId) {
      toast.error('Completa el nombre de la zona y su piso padre.');
      return;
    }

    setHierarchyActionLoading(true);

    try {
      const payload = { name: zoneName.trim(), floor_id: Number(zoneFloorId) };

      if (editingZoneId) {
        await updateZone(editingZoneId, payload);
        toast.success('Zona actualizada correctamente.');
      } else {
        await createZone(payload);
        toast.success('Zona creada correctamente.');
      }

      await refreshHierarchy();
      resetZoneForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar la zona.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleZoneDelete = async (zoneId: number) => {
    setHierarchyActionLoading(true);

    try {
      await deleteZone(zoneId);
      await refreshHierarchy();
      if (editingZoneId === zoneId) {
        resetZoneForm();
      }
      toast.success('Zona eliminada correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar la zona.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleSpaceSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!spaceCode.trim() || !spaceZoneId || !spaceTypeId) {
      toast.error('Completa el código del espacio, su zona padre y el tipo.');
      return;
    }

    setHierarchyActionLoading(true);

    try {
      const payload = {
        code: spaceCode.trim(),
        zone_id: Number(spaceZoneId),
        space_type_id: Number(spaceTypeId),
        status: spaceStatus,
        is_accessible: spaceAccessible,
        is_priority: spacePriority,
      };

      if (editingSpaceId) {
        await updateSpace(editingSpaceId, payload);
        toast.success('Espacio actualizado correctamente.');
      } else {
        await createSpace(payload);
        toast.success('Espacio creado correctamente.');
      }

      await refreshHierarchy();
      resetSpaceForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el espacio.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const handleSpaceDelete = async (spaceId: number) => {
    setHierarchyActionLoading(true);

    try {
      await deleteSpace(spaceId);
      await refreshHierarchy();
      if (editingSpaceId === spaceId) {
        resetSpaceForm();
      }
      toast.success('Espacio eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el espacio.');
    } finally {
      setHierarchyActionLoading(false);
    }
  };

  const openBlockEditor = (block: BlockRecord) => {
    setEditingBlockId(block.block_id);
    setEditingBlockReason(block.reason);
    setEditingBlockStartTime(toDateTimeLocalValue(block.start_time));
    setEditingBlockEndTime(block.end_time ? toDateTimeLocalValue(block.end_time) : '');
    toast.info('Editando bloqueo seleccionado.');
    setBlockManagerOpen(true);
  };

  const resetBlockEditor = () => {
    setEditingBlockId(null);
    setEditingBlockReason('');
    setEditingBlockStartTime('');
    setEditingBlockEndTime('');
  };

  const handleEmergencySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedBlockSpaces.length === 0 || !emergencyReason.trim() || !emergencyStartTime) {
      toast.error('Selecciona al menos un espacio, justificación y fecha de inicio.');
      return;
    }

    setEmergencyLoading(true);

    try {
      const response = await createSpaceBlocks({
        space_ids: selectedBlockSpaces.map((space) => space.space_id),
        reason: emergencyReason.trim(),
        start_time: new Date(emergencyStartTime).toISOString(),
        ...(emergencyIndefinite || !emergencyEndTime
          ? {}
          : { end_time: new Date(emergencyEndTime).toISOString() }),
      });

      toast.success(
        `Bloqueo creado. Se bloquearon ${response.blocks.length} espacios y se cancelaron ${response.cancelledReservations} reservas.`,
      );
      setEmergencyReason('');
      setEmergencyStartTime('');
      setEmergencyEndTime('');
      setEmergencyIndefinite(true);
      setSelectedBlockSpaces([]);
      await refreshBlocks();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear el bloqueo.');
    } finally {
      setEmergencyLoading(false);
    }
  };

  const handleBlockSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingBlockId || !editingBlockReason.trim() || !editingBlockStartTime) {
      toast.error('Completa la justificación y la fecha de inicio.');
      return;
    }

    setBlockActionLoading(true);

    try {
      await updateBlock(editingBlockId, {
        reason: editingBlockReason.trim(),
        start_time: new Date(editingBlockStartTime).toISOString(),
        ...(editingBlockEndTime ? { end_time: new Date(editingBlockEndTime).toISOString() } : {}),
      });

      await refreshBlocks();
      toast.success('Bloqueo actualizado correctamente.');
      resetBlockEditor();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el bloqueo.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleBlockDelete = async (blockId: number) => {
    setBlockActionLoading(true);

    try {
      await deleteBlock(blockId);
      await refreshBlocks();
      if (editingBlockId === blockId) {
        resetBlockEditor();
      }
      toast.success('Bloqueo eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el bloqueo.');
    } finally {
      setBlockActionLoading(false);
    }
  };

  const handleEventSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eventZoneId || !eventUserNeedId || !eventDate || !eventStartTime || !eventEndTime) {
      toast.error('Completa zona, user need, fecha y horario del evento.');
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      toast.error('No se encontró la sesión administrativa.');
      return;
    }

    setEventLoading(true);

    try {
      const response = await createSpecialEventReservations({
        title: eventTitle,
        zone_id: eventZoneId,
        user_id: userId,
        user_need_id: Number(eventUserNeedId),
        start_time: `${eventDate}T${eventStartTime}:00`,
        end_time: `${eventDate}T${eventEndTime}:00`,
      });

      toast.success(
        `Evento "${response.event?.title ?? eventTitle}" registrado. ${response.createdReservations ?? 0} reservas generadas y ${response.cancelledReservations ?? 0} reservas previas canceladas.`,
      );
      await refreshEvents();
      setEventTitle('Town hall / evento especial');
      setEventDate('');
      setEventStartTime('');
      setEventEndTime('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear el evento especial.');
    } finally {
      setEventLoading(false);
    }
  };

  const openEventManager = () => {
    setEventManagerOpen(true);

    if (!userNeeds.length && !userNeedsLoading) {
      void getUserNeeds()
        .then((data) => {
          setUserNeeds(data);
          setManagedEventUserNeedId((current) => current || String(data[0]?.user_need_id ?? ''));
          setUserNeedsError('');
        })
        .catch((error) => {
          setUserNeedsError(error instanceof Error ? error.message : 'No fue posible cargar los user needs.');
        });
    }

    if (!events.length && !eventsLoading) {
      void refreshEvents().catch(() => undefined);
    }
  };

  const openUserNeedManager = () => {
    setUserNeedManagerOpen(true);

    if (!userNeeds.length && !userNeedsLoading) {
      void getUserNeeds()
        .then((data) => {
          setUserNeeds(data);
          setUserNeedsError('');
        })
        .catch((error) => {
          setUserNeedsError(error instanceof Error ? error.message : 'No fue posible cargar los user needs.');
        });
    }

    if (!priorityLevels.length) {
      void refreshPriorityLevels().catch(() => undefined);
    }

    if (!usuarios.length && !loadingUsers) {
      void getUsers()
        .then((data) => setUsuarios(Array.isArray(data) ? data : []))
        .catch(() => setUsuarios([]));
    }

    if (!editingUserNeedId) {
      setManagedUserNeedUserId((current) => current || String(usuarios[0]?.user_id ?? ''));
      setManagedUserNeedPriorityLevelId((current) => current || String(priorityLevels[0]?.priority_level_id ?? ''));
    }
  };

  const handleEventManagerSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingEventId) {
      toast.error('Selecciona un evento para editarlo.');
      return;
    }

    if (!managedEventTitle.trim() || !managedEventUserNeedId || !managedEventStartTime || !managedEventEndTime) {
      toast.error('Completa título, user need, inicio y fin.');
      return;
    }

    setEventManagerLoading(true);

    const payload = {
      title: managedEventTitle.trim(),
      description: managedEventDescription.trim() || undefined,
      location: managedEventLocation.trim() || undefined,
      start_time: new Date(managedEventStartTime).toISOString(),
      end_time: new Date(managedEventEndTime).toISOString(),
      expected_attendees: managedEventExpectedAttendees.trim() ? Number(managedEventExpectedAttendees) : undefined,
      status: managedEventStatus,
      user_need_id: Number(managedEventUserNeedId),
    };

    try {
      await updateEvent(editingEventId, payload);
      toast.success('Evento actualizado correctamente.');

      await refreshEvents();
      resetEventForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar el evento.');
    } finally {
      setEventManagerLoading(false);
    }
  };

  const handleEventCancel = async (eventId: number) => {
    setEventManagerLoading(true);

    try {
      const response = await cancelEvent(eventId);
      await refreshEvents();
      if (editingEventId === eventId) {
        resetEventForm();
      }
      toast.success(
        `Evento cancelado correctamente. ${response.cancelledReservations ?? 0} reservaciones asociadas fueron canceladas.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible cancelar el evento.');
    } finally {
      setEventManagerLoading(false);
    }
  };

  const handleUserNeedSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!managedUserNeedType.trim() || !managedUserNeedReason.trim() || !managedUserNeedStartDate || !managedUserNeedEndDate || !managedUserNeedUserId || !managedUserNeedPriorityLevelId) {
      toast.error('Completa tipo, razón, fechas, usuario y prioridad.');
      return;
    }

    setUserNeedManagerLoading(true);

    const payload = {
      need_type: managedUserNeedType.trim(),
      reason: managedUserNeedReason.trim(),
      start_date: new Date(managedUserNeedStartDate).toISOString(),
      end_date: new Date(managedUserNeedEndDate).toISOString(),
      status: managedUserNeedStatus,
      user_id: Number(managedUserNeedUserId),
      priority_level_id: Number(managedUserNeedPriorityLevelId),
    };

    try {
      if (editingUserNeedId) {
        await updateUserNeed(editingUserNeedId, payload);
        toast.success('Necesidad actualizada correctamente.');
      } else {
        await createUserNeed(payload);
        toast.success('Necesidad creada correctamente.');
      }

      const refreshedNeeds = await getUserNeeds();
      setUserNeeds(refreshedNeeds);
      resetUserNeedForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible guardar la necesidad.');
    } finally {
      setUserNeedManagerLoading(false);
    }
  };

  const handleUserNeedDelete = async (userNeedId: number) => {
    const confirmed = await confirm({
      title: 'Eliminar necesidad',
      description: '¿Deseas eliminar esta necesidad? Esta acción no se puede deshacer.',
      confirmLabel: 'Sí, eliminar',
      tone: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setUserNeedManagerLoading(true);

    try {
      await deleteUserNeed(userNeedId);
      const refreshedNeeds = await getUserNeeds();
      setUserNeeds(refreshedNeeds);

      if (editingUserNeedId === userNeedId) {
        resetUserNeedForm();
      }

      toast.success('Necesidad eliminada correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar la necesidad.');
    } finally {
      setUserNeedManagerLoading(false);
    }
  };

  const handleRewardEdit = (reward: GamificationRewardsResponse['rewards'][number]) => {
  setEditingRewardId(reward.gamification_reward_id);
  setRewardTitle(reward.title);
  setRewardDescription(reward.description);
  setRewardPoints(reward.points);
  toast.info('Editando premio seleccionado.');
};

  const handleRewardDelete = async (rewardId: number) => {
    setRewardSaving(true);

    try {
      await deleteGamificationReward(rewardId);
      if (editingRewardId === rewardId) {
        resetRewardForm();
      }
      await refreshRewards();
      toast.success('Premio eliminado correctamente.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No fue posible eliminar el premio.');
    } finally {
      setRewardSaving(false);
    }
  };

  const handleRewardSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (!rewardTitle.trim() || !rewardDescription.trim()) {
    toast.error('Completa título y descripción.');
    return;
  }

  setRewardSaving(true);

  const payload: GamificationRewardPayload = {
    title: rewardTitle.trim(),
    description: rewardDescription.trim(),
    points: Number(rewardPoints),
    user_id: getCurrentUserId() ?? 0,
  };

  try {
    if (editingRewardId) {
      await updateGamificationReward(editingRewardId, payload);
      toast.success('Premio actualizado correctamente.');
    } else {
      await createGamificationReward(payload);
      toast.success('Premio creado correctamente.');
    }

    await refreshRewards();
    resetRewardForm();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'No fue posible guardar el premio.');
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
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-purple-600">
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
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">User need</label>
              <select
                value={eventUserNeedId}
                onChange={(event) => setEventUserNeedId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                disabled={userNeedsLoading}
              >
                <option value="">Selecciona un user need</option>
                {userNeeds.map((userNeed) => (
                  <option key={userNeed.user_need_id} value={userNeed.user_need_id}>
                    #{userNeed.user_need_id} · {userNeed.need_type} · {userNeed.reason}
                  </option>
                ))}
              </select>
              {userNeedsError ? <p className="mt-1 text-xs text-red-600">{userNeedsError}</p> : null}
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Calendar size={16} />
              {eventLoading ? 'Creando evento...' : 'Crear evento especial'}
            </button>
            <button
              type="button"
              onClick={() => openEventManager()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Calendar size={16} />
              Gestionar eventos
            </button>
            <button
              type="button"
              onClick={() => openUserNeedManager()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Users size={16} />
              Gestionar Necesidades
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Monitor size={20} />
            <h2 className="font-semibold">Gestión de espacios</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Administra edificios, pisos, zonas y espacios con sus relaciones padre-hijo desde un solo panel.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-500">
            <span className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">{sites.length} site(s)</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">{hierarchyBuildings.length} edificios</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">{hierarchyFloors.length} pisos</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">{hierarchyZones.length} zonas</span>
          </div>
          <button
            className="mt-5 w-full rounded-lg bg-slate-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            onClick={() => openHierarchyManager()}
            type="button"
          >
            Administrar espacios
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
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <label className="flex h-11 min-w-[280px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm shadow-sm focus-within:border-purple-500 dark:border-slate-700 dark:bg-slate-900">
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
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-500/30'
                              : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50'
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
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
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
                    className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700"
                  >
                    Listo
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}

      {hierarchyManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-2 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Gestión de espacios</h3>
                <p className="mt-1 text-sm text-slate-500">Administrar edificios, pisos, zonas y espacios</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHierarchyManagerOpen(false);
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-4 overflow-y-auto p-4 sm:gap-6 sm:p-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4 overflow-y-auto pr-1">
                {hierarchyError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {hierarchyError}
                  </div>
                ) : null}

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">Edificios</h4>
                      <p className="text-sm text-slate-500">Cada edificio debe pertenecer a un site.</p>
                    </div>
                    <button type="button" onClick={resetBuildingForm} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Nuevo</button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hierarchyBuildings.map((building) => (
                      <div key={building.building_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Site {building.site?.name ?? building.site_id}</p>
                            <h5 className="mt-1 font-semibold text-slate-900 dark:text-white">{building.name}</h5>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openBuildingEditor(building)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Editar</button>
                            <button type="button" onClick={() => handleBuildingDelete(building.building_id)} disabled={hierarchyActionLoading} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hierarchyBuildings.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No hay edificios registrados.</p> : null}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">Pisos</h4>
                      <p className="text-sm text-slate-500">Cada piso depende de un edificio.</p>
                    </div>
                    <button type="button" onClick={resetFloorForm} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Nuevo</button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hierarchyFloors.map((floor) => (
                      <div key={floor.floor_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{floor.floor_type === 'parking' ? 'Parking' : 'Office'} · {floor.building?.name ?? `Edificio ${floor.building_id}`}</p>
                            <h5 className="mt-1 font-semibold text-slate-900 dark:text-white">Piso {floor.name}</h5>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openFloorEditor(floor)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Editar</button>
                            <button type="button" onClick={() => handleFloorDelete(floor.floor_id)} disabled={hierarchyActionLoading} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hierarchyFloors.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No hay pisos registrados.</p> : null}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">Zonas</h4>
                      <p className="text-sm text-slate-500">Cada zona depende de un piso.</p>
                    </div>
                    <button type="button" onClick={resetZoneForm} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Nuevo</button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hierarchyZones.map((zone) => (
                      <div key={zone.zone_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{zone.floor?.building?.name ?? `Edificio ${zone.floor?.building_id ?? zone.floor_id}`}</p>
                            <h5 className="mt-1 font-semibold text-slate-900 dark:text-white">Zona {zone.name}</h5>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openZoneEditor(zone)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Editar</button>
                            <button type="button" onClick={() => handleZoneDelete(zone.zone_id)} disabled={hierarchyActionLoading} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hierarchyZones.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No hay zonas registradas.</p> : null}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">Espacios</h4>
                      <p className="text-sm text-slate-500">Cada espacio depende de una zona y de un tipo.</p>
                    </div>
                    <button type="button" onClick={resetSpaceForm} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">Nuevo</button>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hierarchySpaces.map((space) => (
                      <div key={space.space_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{space.zone?.name ?? `Zona ${space.zone_id}`} · {space.space_type?.name ?? 'Espacio'}</p>
                            <h5 className="mt-1 font-semibold text-slate-900 dark:text-white">{space.code}</h5>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => openSpaceEditor(space)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Editar</button>
                            <button type="button" onClick={() => handleSpaceDelete(space.space_id)} disabled={hierarchyActionLoading} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Borrar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hierarchySpaces.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">No hay espacios registrados.</p> : null}
                  </div>
                </section>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Formulario</h4>
                  <span className="text-xs text-slate-400">{hierarchyActionLoading ? 'Guardando...' : ''}</span>
                </div>


                <div className="mt-5 space-y-6">
                  <form onSubmit={handleBuildingSave} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="font-semibold text-slate-900 dark:text-white">Edificio</h5>
                      <button type="button" onClick={resetBuildingForm} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Limpiar</button>
                    </div>
                    <input value={buildingName} onChange={(event) => setBuildingName(event.target.value)} placeholder="Nombre del edificio" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                    <select value={buildingSiteId} onChange={(event) => setBuildingSiteId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="">Selecciona un site</option>
                      {sites.map((site) => <option key={site.site_id} value={site.site_id}>{site.name}</option>)}
                    </select>
                    <button type="submit" className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">{editingBuildingId ? 'Actualizar edificio' : 'Crear edificio'}</button>
                  </form>

                  <form onSubmit={handleFloorSave} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="font-semibold text-slate-900 dark:text-white">Piso</h5>
                      <button type="button" onClick={resetFloorForm} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Limpiar</button>
                    </div>
                    <input value={floorName} onChange={(event) => setFloorName(event.target.value)} placeholder="Nombre del piso" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                    <select value={floorBuildingId} onChange={(event) => setFloorBuildingId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="">Selecciona un edificio</option>
                      {hierarchyBuildings.map((building) => <option key={building.building_id} value={building.building_id}>{building.name}</option>)}
                    </select>
                    <select value={floorType} onChange={(event) => setFloorType(event.target.value as 'office' | 'parking')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="office">Oficinas</option>
                      <option value="parking">Estacionamiento</option>
                    </select>
                    <button type="submit" className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">{editingFloorId ? 'Actualizar piso' : 'Crear piso'}</button>
                  </form>

                  <form onSubmit={handleZoneSave} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="font-semibold text-slate-900 dark:text-white">Zona</h5>
                      <button type="button" onClick={resetZoneForm} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Limpiar</button>
                    </div>
                    <input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="Nombre de la zona" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                    <select value={zoneFloorId} onChange={(event) => setZoneFloorId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="">Selecciona un piso</option>
                      {hierarchyFloors.map((floor) => <option key={floor.floor_id} value={floor.floor_id}>{floor.name} · {floor.building?.name ?? `Edificio ${floor.building_id}`}</option>)}
                    </select>
                    <button type="submit" className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">{editingZoneId ? 'Actualizar zona' : 'Crear zona'}</button>
                  </form>

                  <form onSubmit={handleSpaceSave} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="font-semibold text-slate-900 dark:text-white">Espacio</h5>
                      <button type="button" onClick={resetSpaceForm} className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200">Limpiar</button>
                    </div>
                    <input value={spaceCode} onChange={(event) => setSpaceCode(event.target.value)} placeholder="Código del espacio" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
                    <select value={spaceZoneId} onChange={(event) => setSpaceZoneId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="">Selecciona una zona</option>
                      {hierarchyZones.map((zone) => <option key={zone.zone_id} value={zone.zone_id}>{zone.name} · {zone.floor?.name ?? `Piso ${zone.floor_id}`}</option>)}
                    </select>
                    <select value={spaceTypeId} onChange={(event) => setSpaceTypeId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="">Selecciona un tipo</option>
                      {spaceTypes.map((type) => <option key={type.space_type_id} value={type.space_type_id}>{type.name}</option>)}
                    </select>
                    <select value={spaceStatus} onChange={(event) => setSpaceStatus(event.target.value as 'available' | 'occupied' | 'maintenance' | 'blocked')} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="available">Disponible</option>
                      <option value="occupied">Ocupado</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="blocked">Bloqueado</option>
                    </select>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={spaceAccessible} onChange={(event) => setSpaceAccessible(event.target.checked)} /> Accesible</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" checked={spacePriority} onChange={(event) => setSpacePriority(event.target.checked)} /> Prioridad</label>
                    </div>
                    <button type="submit" className="w-full rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700">{editingSpaceId ? 'Actualizar espacio' : 'Crear espacio'}</button>
                  </form>
                </div>

                <p className="mt-4 text-xs text-slate-400">Si eliminas un padre con hijos asociados, el backend puede rechazar la operación hasta limpiar primero sus dependencias.</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {eventManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Administrar eventos</h3>
                <p className="mt-1 text-sm text-slate-500">Crea, edita y elimina eventos del módulo principal.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEventManagerOpen(false);
                  resetEventForm();
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-6 overflow-hidden p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-h-[calc(90vh-8rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 pr-2 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Eventos actuales</h4>
                    <p className="text-sm text-slate-500">{events.length} evento(s) registrados.</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetEventForm}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    Nuevo
                  </button>
                </div>

                {eventsLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cargando eventos...
                  </div>
                ) : eventsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {eventsError}
                  </div>
                ) : (
                  <div className="max-h-[calc(90vh-15rem)] space-y-3 overflow-y-auto pr-1">
                    {events.map((eventRecord) => {
                      const userNeedLabel = eventRecord.userNeed
                        ? `${eventRecord.userNeed.need_type} · ${eventRecord.userNeed.reason}`
                        : `User need #${eventRecord.user_need_id}`;
                      const creatorLabel = eventRecord.creator?.full_name ?? eventRecord.creator?.email ?? `#${eventRecord.created_by}`;

                      return (
                        <div key={eventRecord.event_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                                <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">{eventStatusOptions.find((option) => option.value === eventRecord.status)?.label ?? eventRecord.status}</span>
                                <span>{userNeedLabel}</span>
                              </div>
                              <h5 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{eventRecord.title}</h5>
                              <p className="mt-1 text-sm text-slate-500">
                                {eventRecord.location ? `${eventRecord.location} · ` : ''}
                                {creatorLabel}
                              </p>
                              {eventRecord.description ? <p className="mt-2 text-sm text-slate-500">{eventRecord.description}</p> : null}
                              <p className="mt-2 text-xs text-slate-400">
                                {format(new Date(eventRecord.start_time), 'PPp')}
                                {' - '}
                                {format(new Date(eventRecord.end_time), 'PPp')}
                                {eventRecord.expected_attendees ? ` · ${eventRecord.expected_attendees} asistentes esperados` : ''}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEventEditor(eventRecord)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <PencilLine size={16} />
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEventCancel(eventRecord.event_id)}
                                disabled={eventManagerLoading}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 size={16} />
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {events.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                        Todavía no hay eventos registrados.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="max-h-[calc(90vh-8rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 pr-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingEventId ? 'Editar evento' : 'Selecciona un evento'}
                  </h4>
                  <span className="text-xs text-slate-400">{eventManagerLoading ? 'Guardando...' : ''}</span>
                </div>


                <div className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Título</label>
                    <input
                      value={managedEventTitle}
                      onChange={(event) => setManagedEventTitle(event.target.value)}
                      disabled={!editingEventId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Descripción</label>
                    <textarea
                      value={managedEventDescription}
                      onChange={(event) => setManagedEventDescription(event.target.value)}
                      rows={3}
                      disabled={!editingEventId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Ubicación</label>
                    <input
                      value={managedEventLocation}
                      onChange={(event) => setManagedEventLocation(event.target.value)}
                      disabled={!editingEventId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">User need</label>
                    <select
                      value={managedEventUserNeedId}
                      onChange={(event) => setManagedEventUserNeedId(event.target.value)}
                      disabled={!editingEventId || userNeedsLoading}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Selecciona un user need</option>
                      {userNeeds.map((userNeed) => (
                        <option key={userNeed.user_need_id} value={userNeed.user_need_id}>
                          #{userNeed.user_need_id} · {userNeed.need_type} · {userNeed.reason}
                        </option>
                      ))}
                    </select>
                    {userNeedsError ? <p className="mt-1 text-xs text-red-600">{userNeedsError}</p> : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                    <select
                      value={managedEventStatus}
                      onChange={(event) => setManagedEventStatus(event.target.value as EventStatus)}
                      disabled={!editingEventId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {eventStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio</label>
                      <input
                        type="datetime-local"
                        value={managedEventStartTime}
                        onChange={(event) => setManagedEventStartTime(event.target.value)}
                        disabled={!editingEventId}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin</label>
                      <input
                        type="datetime-local"
                        value={managedEventEndTime}
                        onChange={(event) => setManagedEventEndTime(event.target.value)}
                        disabled={!editingEventId}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Asistentes esperados</label>
                    <input
                      type="number"
                      min="0"
                      value={managedEventExpectedAttendees}
                      onChange={(event) => setManagedEventExpectedAttendees(event.target.value)}
                      disabled={!editingEventId}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={resetEventForm}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Cancelar edición
                    </button>
                    <button
                      type="submit"
                      disabled={eventManagerLoading || userNeedsLoading || !editingEventId}
                      className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Guardar cambios
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {userNeedManagerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Gestionar Necesidades</h3>
                <p className="mt-1 text-sm text-slate-500">Crea, edita y elimina user needs desde este panel.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUserNeedManagerOpen(false);
                  resetUserNeedForm();
                }}
                className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid flex-1 min-h-0 gap-6 overflow-hidden p-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="max-h-[calc(90vh-8rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 pr-2 dark:border-slate-800 dark:bg-slate-950/40">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">User needs actuales</h4>
                    <p className="text-sm text-slate-500">{userNeeds.length} necesidad(es) registradas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetUserNeedForm}
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900"
                  >
                    Nuevo
                  </button>
                </div>

                {userNeedsLoading ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                    Cargando user needs...
                  </div>
                ) : userNeedsError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {userNeedsError}
                  </div>
                ) : (
                  <div className="max-h-[calc(90vh-15rem)] space-y-3 overflow-y-auto pr-1">
                    {userNeeds.map((userNeed) => (
                      <div key={userNeed.user_need_id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">{userNeed.status}</span>
                              <span>{userNeed.need_type}</span>
                              <span>{userNeed.priorityLevel ? `${userNeed.priorityLevel.name} · ${userNeed.priorityLevel.scale}` : `Priority #${userNeed.priority_level_id}`}</span>
                            </div>
                            <h5 className="mt-2 text-base font-bold text-slate-900 dark:text-white">{userNeed.reason}</h5>
                            <p className="mt-1 text-sm text-slate-500">
                              {userNeed.user?.full_name ?? userNeed.user?.email ?? `Usuario #${userNeed.user_id}`}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                              {format(new Date(userNeed.start_date), 'PPp')}
                              {' - '}
                              {format(new Date(userNeed.end_date), 'PPp')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openUserNeedEditor(userNeed)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <PencilLine size={16} />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUserNeedDelete(userNeed.user_need_id)}
                              disabled={userNeedManagerLoading}
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {userNeeds.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                        Todavía no hay user needs registrados.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="max-h-[calc(90vh-8rem)] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 pr-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {editingUserNeedId ? 'Editar user need' : 'Nuevo user need'}
                  </h4>
                  <span className="text-xs text-slate-400">{userNeedManagerLoading ? 'Guardando...' : ''}</span>
                </div>


                <form onSubmit={handleUserNeedSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tipo</label>
                    <input
                      value={managedUserNeedType}
                      onChange={(event) => setManagedUserNeedType(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Razón</label>
                    <textarea
                      value={managedUserNeedReason}
                      onChange={(event) => setManagedUserNeedReason(event.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Inicio</label>
                      <input
                        type="datetime-local"
                        value={managedUserNeedStartDate}
                        onChange={(event) => setManagedUserNeedStartDate(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Fin</label>
                      <input
                        type="datetime-local"
                        value={managedUserNeedEndDate}
                        onChange={(event) => setManagedUserNeedEndDate(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Estado</label>
                    <select
                      value={managedUserNeedStatus}
                      onChange={(event) => setManagedUserNeedStatus(event.target.value as 'active' | 'inactive' | 'expired')}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="expired">Expirado</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Usuario</label>
                    <select
                      value={managedUserNeedUserId}
                      onChange={(event) => setManagedUserNeedUserId(event.target.value)}
                      disabled={loadingUsers}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Selecciona un usuario</option>
                      {usuarios.map((user) => (
                        <option key={user.user_id} value={user.user_id}>
                          #{user.user_id} · {user.full_name ?? user.email ?? 'Sin nombre'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Priority level</label>
                    <select
                      value={managedUserNeedPriorityLevelId}
                      onChange={(event) => setManagedUserNeedPriorityLevelId(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <option value="">Selecciona una prioridad</option>
                      {priorityLevels.map((priorityLevel) => (
                        <option key={priorityLevel.priority_level_id} value={priorityLevel.priority_level_id}>
                          #{priorityLevel.priority_level_id} · {priorityLevel.name} · {priorityLevel.scale}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={resetUserNeedForm}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                      Nuevo
                    </button>
                    <button
                      type="submit"
                      disabled={userNeedManagerLoading || loadingUsers || !managedUserNeedUserId || !managedUserNeedPriorityLevelId}
                      className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      Guardar
                    </button>
                  </div>
                </form>
              </div>
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
                        className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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
                              <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">Usuario</span>
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
                      className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:flex-1"
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
