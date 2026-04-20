import {
  AdminAppointmentsResult,
  AdminAppointmentCreateResult,
  AppointmentMutationResult,
  ApiError,
  BarberAdminItem,
  BarberAvailabilityResult,
  BarberServicePricingItem,
  DeleteScheduleItemResult,
  ScheduleBlockedSlotMutationResult,
  ScheduleDayOffMutationResult,
  ScheduleDayResult,
  ScheduleWeekResult,
  SalonAdminSettings,
  ServiceAdminItem,
  StaffSession,
  WorkingHoursAdminItem,
} from './types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error: ApiError = {
      statusCode: response.status,
      message:
        payload?.message && typeof payload.message === 'string'
          ? payload.message
          : 'API request failed.',
    };
    throw error;
  }

  return payload as T;
}

function withQuery(path: string, query: Record<string, string | number | undefined>) {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export async function loginStaff(input: {
  email: string;
  password: string;
}): Promise<StaffSession> {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/staff/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  return parseResponse<StaffSession>(response);
}

export async function fetchAdminScheduleDay(input: {
  accessToken: string;
  date: string;
  barberId?: string;
}): Promise<ScheduleDayResult> {
  const response = await fetch(
    withQuery('/api/v1/admin/schedule/day', {
      date: input.date,
      barberId: input.barberId,
    }),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      cache: 'no-store',
    },
  );

  return parseResponse<ScheduleDayResult>(response);
}

export async function fetchAdminScheduleWeek(input: {
  accessToken: string;
  startDate: string;
  barberId?: string;
}): Promise<ScheduleWeekResult> {
  const response = await fetch(
    withQuery('/api/v1/admin/schedule/week', {
      startDate: input.startDate,
      barberId: input.barberId,
    }),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      cache: 'no-store',
    },
  );

  return parseResponse<ScheduleWeekResult>(response);
}

export async function fetchAdminAppointments(input: {
  accessToken: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  dateFrom?: string;
  dateTo?: string;
  barberId?: string;
  status?: string;
  customerPhone?: string;
}): Promise<AdminAppointmentsResult> {
  const response = await fetch(
    withQuery('/api/v1/admin/appointments', {
      page: input.page,
      pageSize: input.pageSize,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      barberId: input.barberId,
      status: input.status,
      customerPhone: input.customerPhone,
    }),
    {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
      cache: 'no-store',
    },
  );

  return parseResponse<AdminAppointmentsResult>(response);
}

export async function fetchBarberAvailability(input: {
  salonId: string;
  barberId: string;
  barberServiceId: string;
  date: string;
}): Promise<BarberAvailabilityResult> {
  const response = await fetch(
    withQuery(`/api/v1/public/barbers/${input.barberId}/availability`, {
      barberServiceId: input.barberServiceId,
      date: input.date,
    }),
    {
      headers: {
        'x-salon-id': input.salonId,
      },
      cache: 'no-store',
    },
  );

  return parseResponse<BarberAvailabilityResult>(response);
}

async function authorizedJson<T>(
  path: string,
  accessToken: string,
  options?: {
    method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
  },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  return parseResponse<T>(response);
}

export function fetchAdminBarbers(accessToken: string) {
  return authorizedJson<BarberAdminItem[]>('/api/v1/admin/barbers', accessToken);
}

export function createAdminBarber(
  accessToken: string,
  body: Omit<BarberAdminItem, 'id' | 'linkedStaffEmail' | 'activeServicesCount'>,
) {
  return authorizedJson<BarberAdminItem>('/api/v1/admin/barbers', accessToken, {
    method: 'POST',
    body,
  });
}

export function updateAdminBarber(
  accessToken: string,
  barberId: string,
  body: Partial<Omit<BarberAdminItem, 'id' | 'linkedStaffEmail' | 'activeServicesCount'>>,
) {
  return authorizedJson<BarberAdminItem>(
    `/api/v1/admin/barbers/${barberId}`,
    accessToken,
    {
      method: 'PATCH',
      body,
    },
  );
}

export function fetchAdminServices(accessToken: string) {
  return authorizedJson<ServiceAdminItem[]>('/api/v1/admin/services', accessToken);
}

export function createAdminService(
  accessToken: string,
  body: Omit<ServiceAdminItem, 'id' | 'activeBarbersCount'>,
) {
  return authorizedJson<ServiceAdminItem>('/api/v1/admin/services', accessToken, {
    method: 'POST',
    body,
  });
}

export function updateAdminService(
  accessToken: string,
  serviceId: string,
  body: Partial<Omit<ServiceAdminItem, 'id' | 'activeBarbersCount'>>,
) {
  return authorizedJson<ServiceAdminItem>(
    `/api/v1/admin/services/${serviceId}`,
    accessToken,
    {
      method: 'PATCH',
      body,
    },
  );
}

export function fetchAdminBarberServices(accessToken: string) {
  return authorizedJson<BarberServicePricingItem[]>(
    '/api/v1/admin/barber-services',
    accessToken,
  );
}

export function upsertAdminBarberServices(
  accessToken: string,
  items: Array<{
    barberId: string;
    serviceId: string;
    priceAmount: number;
    currency: string;
    durationOverrideMinutes?: number | null;
    isActive: boolean;
  }>,
) {
  return authorizedJson<BarberServicePricingItem[]>(
    '/api/v1/admin/barber-services',
    accessToken,
    {
      method: 'PUT',
      body: { items },
    },
  );
}

export function fetchSalonSettings(accessToken: string) {
  return authorizedJson<SalonAdminSettings>(
    '/api/v1/admin/settings/salon',
    accessToken,
  );
}

export function updateSalonSettings(
  accessToken: string,
  body: Partial<SalonAdminSettings>,
) {
  const { id: _id, ...payload } = body;

  return authorizedJson<SalonAdminSettings>(
    '/api/v1/admin/settings/salon',
    accessToken,
    {
      method: 'PUT',
      body: payload,
    },
  );
}

export function fetchWorkingHours(accessToken: string) {
  return authorizedJson<WorkingHoursAdminItem[]>(
    '/api/v1/admin/settings/working-hours',
    accessToken,
  );
}

export function replaceWorkingHours(
  accessToken: string,
  items: WorkingHoursAdminItem[],
) {
  return authorizedJson<WorkingHoursAdminItem[]>(
    '/api/v1/admin/settings/working-hours',
    accessToken,
    {
      method: 'PUT',
      body: { items },
    },
  );
}

export function createAdminAppointment(
  accessToken: string,
  body: {
    customerPhoneNumber: string;
    customerFirstName: string;
    customerLastName?: string;
    barberId: string;
    barberServiceId: string;
    startAt: string;
  },
) {
  return authorizedJson<AdminAppointmentCreateResult>(
    '/api/v1/admin/appointments',
    accessToken,
    {
      method: 'POST',
      body,
    },
  );
}

export function updateAdminAppointment(
  accessToken: string,
  appointmentId: string,
  body: {
    status: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
    cancelReason?: string;
  },
) {
  return authorizedJson<AppointmentMutationResult>(
    `/api/v1/admin/appointments/${appointmentId}`,
    accessToken,
    {
      method: 'PATCH',
      body,
    },
  );
}

export function createAdminBarberDayOff(
  accessToken: string,
  barberId: string,
  body: {
    dateLocal: string;
    reason?: string;
  },
) {
  return authorizedJson<ScheduleDayOffMutationResult>(
    `/api/v1/admin/barbers/${barberId}/day-off`,
    accessToken,
    {
      method: 'POST',
      body,
    },
  );
}

export function deleteAdminBarberDayOff(
  accessToken: string,
  barberId: string,
  dayOffId: string,
) {
  return authorizedJson<DeleteScheduleItemResult>(
    `/api/v1/admin/barbers/${barberId}/day-off/${dayOffId}`,
    accessToken,
    {
      method: 'DELETE',
    },
  );
}

export function createAdminBlockedSlot(
  accessToken: string,
  barberId: string,
  body: {
    startAt: string;
    endAt: string;
    reasonType: 'BREAK' | 'PERSONAL' | 'TRAINING' | 'OTHER';
    note?: string;
  },
) {
  return authorizedJson<ScheduleBlockedSlotMutationResult>(
    `/api/v1/admin/barbers/${barberId}/blocked-slots`,
    accessToken,
    {
      method: 'POST',
      body,
    },
  );
}

export function deleteAdminBlockedSlot(
  accessToken: string,
  barberId: string,
  blockedSlotId: string,
) {
  return authorizedJson<DeleteScheduleItemResult>(
    `/api/v1/admin/barbers/${barberId}/blocked-slots/${blockedSlotId}`,
    accessToken,
    {
      method: 'DELETE',
    },
  );
}
