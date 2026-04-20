export type StaffRole = 'ADMIN' | 'BARBER';

export type StaffSession = {
  accessToken: string;
  refreshToken: string;
  staff: {
    id: string;
    email: string;
    role: StaffRole;
    salonId: string;
    barberId?: string | null;
    displayName?: string | null;
  };
};

export type ApiError = {
  statusCode?: number;
  message: string;
};

export type BlockedSlotReasonType =
  | 'BREAK'
  | 'PERSONAL'
  | 'TRAINING'
  | 'OTHER';

export type BarberAdminItem = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  level?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  isActive: boolean;
  displayOrder: number;
  linkedStaffEmail?: string | null;
  activeServicesCount: number;
};

export type ServiceAdminItem = {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  isActive: boolean;
  displayOrder: number;
  activeBarbersCount: number;
};

export type BarberServicePricingItem = {
  barberServiceId?: string | null;
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  priceAmount: number;
  currency: string;
  durationOverrideMinutes?: number | null;
  isActive: boolean;
  exists: boolean;
};

export type SalonAdminSettings = {
  id: string;
  name: string;
  slug: string;
  brandName?: string | null;
  phone: string;
  address: string;
  timezone: string;
  currency: string;
  slotGranularityMinutes: number;
  isActive: boolean;
};

export type WorkingHoursAdminItem = {
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'REQUIRES_RESCHEDULE';

export type ScheduleDaySummary = {
  totalSegments: number;
  freeSegments: number;
  bookedSegments: number;
  blockedSegments: number;
  dayOffSegments: number;
  requiresRescheduleSegments: number;
};

export type ScheduleCalendarItem = {
  id: string;
  type: 'APPOINTMENT' | 'BLOCKED_SLOT' | 'DAY_OFF';
  startAt: string;
  endAt: string;
  title: string;
  subtitle?: string;
  status?: AppointmentStatus;
  appointmentId?: string;
  blockedSlotId?: string;
  dayOffId?: string;
};

export type ScheduleDayResult = {
  date: string;
  timezone: string;
  slotGranularityMinutes: number;
  barbers: Array<{
    barberId: string;
    displayName: string;
    isActive: boolean;
    workingHours: {
      dayOfWeek: number;
      startTimeLocal: string;
      endTimeLocal: string;
      isActive: boolean;
    } | null;
    dayOff: {
      id: string;
      dateLocal: string;
      reason?: string | null;
    } | null;
    blockedSlots: Array<{
      id: string;
      startAt: string;
      endAt: string;
      reasonType: BlockedSlotReasonType;
      note?: string | null;
    }>;
    appointments: Array<{
      id: string;
      status: AppointmentStatus;
      startAt: string;
      endAt: string;
      serviceId: string;
      serviceName: string;
      customerId: string;
      customerFirstName?: string | null;
      customerLastName?: string | null;
      customerPhone: string;
      createdByType: 'CUSTOMER' | 'ADMIN' | 'BARBER';
    }>;
    segments: Array<{
      startAt: string;
      endAt: string;
      state: 'FREE' | 'BOOKED' | 'BLOCKED' | 'DAY_OFF' | 'REQUIRES_RESCHEDULE';
      appointmentId?: string;
      blockedSlotId?: string;
    }>;
    summary: ScheduleDaySummary;
  }>;
  calendar: {
    timeAxis: Array<{
      startAt: string;
      endAt: string;
      label: string;
    }>;
    columns: Array<{
      barberId: string;
      displayName: string;
      summary: ScheduleDaySummary;
      items: ScheduleCalendarItem[];
    }>;
  };
};

export type ScheduleWeekResult = {
  startDate: string;
  endDate: string;
  timezone: string;
  slotGranularityMinutes: number;
  calendar: {
    columns: Array<{
      barberId: string;
      displayName: string;
      isActive: boolean;
    }>;
    days: Array<{
      date: string;
      cells: Array<{
        barberId: string;
        displayName: string;
        isWorkingDay: boolean;
        hasDayOff: boolean;
        appointmentCount: number;
        blockedSlotCount: number;
        summary: ScheduleDaySummary;
      }>;
    }>;
  };
};

export type AdminAppointmentsResult = {
  items: Array<{
    id: string;
    status: AppointmentStatus;
    barberId: string;
    barberName: string;
    serviceId: string;
    serviceName: string;
    customerId: string;
    customerPhone: string;
    customerFirstName?: string | null;
    customerLastName?: string | null;
    startAt: string;
    endAt: string;
    priceAmount: number;
    currency: string;
    createdByType: 'CUSTOMER' | 'ADMIN' | 'BARBER';
    cancelReason?: string | null;
    requiresRescheduleReason?: string | null;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  sort: {
    sortBy: 'START_AT' | 'STATUS' | 'BARBER_NAME' | 'CUSTOMER_PHONE' | 'CREATED_AT';
    sortDirection: 'ASC' | 'DESC';
  };
};

export type BarberAvailabilityResult = {
  date: string;
  barberId: string;
  barberServiceId: string;
  barberAvailable: boolean;
  message: string | null;
  slotGranularityMinutes: number;
  serviceDurationMinutes: number;
  slots: Array<{
    startAt: string;
    endAt: string;
  }>;
};

export type AppointmentMutationResult = {
  id: string;
  status: 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  cancelledAt?: string;
  cancelReason?: string;
};

export type AdminAppointmentCreateResult = {
  id: string;
  status: 'CONFIRMED';
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  priceAmount: number;
  currency: string;
};

export type ScheduleDayOffMutationResult = {
  id: string;
  barberId: string;
  dateLocal: string;
  reason?: string | null;
  impactedAppointments: number;
};

export type ScheduleBlockedSlotMutationResult = {
  id: string;
  barberId: string;
  startAt: string;
  endAt: string;
  reasonType: BlockedSlotReasonType;
  note?: string | null;
  impactedAppointments: number;
};

export type DeleteScheduleItemResult = {
  id: string;
  success: true;
};
