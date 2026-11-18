/**
 * HOMECARE API CONTRACT — shared by backend/ and mobile-app/*.
 *
 * Single file on purpose: it is compiled from source by every consumer (Rspack, Metro, Vitest, Jest)
 * without a build step. Keep it framework-free; `zod` is the only import (peer dependency).
 */
import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Phone numbers (India)
// ─────────────────────────────────────────────────────────────────────────────

/** Indian mobile numbers: 10 digits starting 6–9, stored as E.164 (+91XXXXXXXXXX). */
const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Normalises user input to E.164, or returns null if it isn't a valid Indian mobile number.
 * Accepts "98400 12345", "+91 98400-12345", "091 9840012345", "919840012345".
 */
export function normaliseIndianMobile(input: string): string | null {
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return INDIAN_MOBILE.test(digits) ? `+91${digits}` : null;
}

/** "+919840012345" → "+91 ••••• •2345" (for logs and UI confirmations). */
export const maskPhone = (e164: string) => `${e164.slice(0, 3)} ••••• •${e164.slice(-4)}`;

/** Display format: "+91 98400 12345". */
export const formatPhone = (e164: string) => `${e164.slice(0, 3)} ${e164.slice(3, 8)} ${e164.slice(8)}`;

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Enter your mobile number")
  .transform((v, ctx) => {
    const n = normaliseIndianMobile(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Enter a valid 10-digit Indian mobile number" });
      return z.NEVER;
    }
    return n;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export const OTP_LENGTH = 6;

export const sendOtpSchema = z.object({ phone: phoneSchema });
export type SendOtpInput = z.input<typeof sendOtpSchema>;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`);

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  /** Optional device label for the session list, e.g. "iPhone 15". */
  deviceName: z.string().trim().max(80).optional(),
});
export type VerifyOtpInput = z.input<typeof verifyOtpSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(20).max(512) });

export type SendOtpResult = { expiresInSeconds: number; resendAfterSeconds: number };

export type AuthTokens = {
  accessToken: string;
  /** Seconds until the access token expires. */
  accessTokenExpiresIn: number;
  /** Opaque, single-use; rotate on every refresh. Store in secure storage only. */
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type AuthSession = AuthTokens & { customer: CustomerProfile };

// ─────────────────────────────────────────────────────────────────────────────
// Customer profile
// ─────────────────────────────────────────────────────────────────────────────

export const updateCustomerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80, "Keep it under 80 characters"),
    email: z
      .union([z.literal(""), z.email("Enter a valid email address").max(254)])
      .nullable()
      .optional()
      .transform((v) => (v === "" ? null : v)),
  })
  .partial();
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;

export type CustomerProfile = {
  id: string;
  /** E.164; tied to the account and changed only through re-verification. */
  phone: string;
  fullName: string | null;
  email: string | null;
  createdAt: string;
  /** True once the required fields (full name) are present. */
  profileComplete: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Addresses
// ─────────────────────────────────────────────────────────────────────────────

/** Homecare currently serves one city. Exact-area serviceability is confirmed per request. */
export const SERVICE_CITY = { city: "Chennai", state: "Tamil Nadu" } as const;

export const addressLabels = ["home", "work", "other"] as const;
export type AddressLabel = (typeof addressLabels)[number];

const addressFields = {
  label: z.enum(addressLabels),
  line1: z.string().trim().min(5, "Enter the house/flat number and street").max(200),
  line2: z.string().trim().max(200).optional().nullable(),
  landmark: z.string().trim().max(120).optional().nullable(),
  city: z.literal(SERVICE_CITY.city, { error: `We currently serve ${SERVICE_CITY.city} only` }),
  state: z.literal(SERVICE_CITY.state, { error: `We currently serve ${SERVICE_CITY.city}, ${SERVICE_CITY.state} only` }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isDefault: z.boolean().optional(),
};

export const createAddressSchema = z
  .object(addressFields)
  .refine((a) => (a.latitude == null) === (a.longitude == null), { message: "Provide both latitude and longitude, or neither", path: ["latitude"] });
export type CreateAddressInput = z.input<typeof createAddressSchema>;

export const updateAddressSchema = z
  .object(addressFields)
  .partial()
  .refine((a) => Object.keys(a).length > 0, { message: "Nothing to update" });
export type UpdateAddressInput = z.input<typeof updateAddressSchema>;

export type Address = {
  id: string;
  label: AddressLabel;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Service requests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lifecycle of a customer request, in workflow order (values unchanged since milestone 2):
 *   pending (under review) → assigned (professional allocated) → confirmed (appointment confirmed
 *   with the customer) → in_progress → completed.   cancelled is terminal.
 * "pending" is NOT a booking. Assignment and confirmation are separate staff actions, and the
 * backend enforces every transition (see backend/src/modules/requests/request-workflow.ts).
 */
export const requestStatuses = ["pending", "assigned", "confirmed", "in_progress", "completed", "cancelled"] as const;
export type RequestStatus = (typeof requestStatuses)[number];

/** A customer may cancel in the app until the work starts. */
export const customerCancellableStatuses: readonly RequestStatus[] = ["pending", "assigned", "confirmed"];
export const canCustomerCancel = (s: RequestStatus) => customerCancellableStatuses.includes(s);

/** Concrete appointment windows (a request's "flexible" preference becomes one of these when scheduled). */
export const timeSlots = ["morning", "afternoon", "evening"] as const;
export type TimeSlot = (typeof timeSlots)[number];
export const timeSlotLabels: Record<TimeSlot, string> = { morning: "Morning", afternoon: "Afternoon", evening: "Evening" };

/** Scheduled appointment, present once a professional is assigned. */
export type Appointment = {
  date: string;
  slot: TimeSlot;
  /** First name only: customers don't see professionals' contact details in the app. */
  professionalFirstName: string;
  confirmed: boolean;
};

export const preferredTimes = ["morning", "afternoon", "evening", "flexible"] as const;
export type PreferredTime = (typeof preferredTimes)[number];

/** How far ahead a customer can ask for a date. */
export const MAX_PREFERRED_DAYS_AHEAD = 30;
export const SERVICE_TIME_ZONE = "Asia/Kolkata";

/** Today's date (yyyy-mm-dd) in India. */
export function todayInIndia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SERVICE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Adds days to a yyyy-mm-dd date (calendar arithmetic, timezone-free). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const preferredDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Choose a valid date")
  .refine((d) => d >= todayInIndia(), "Choose today or a later date")
  .refine((d) => d <= addDays(todayInIndia(), MAX_PREFERRED_DAYS_AHEAD), `Choose a date within ${MAX_PREFERRED_DAYS_AHEAD} days`);

/**
 * Body of POST /requests. `service` is validated against @homecare/catalog on the server
 * (kept as a plain string here so this package doesn't depend on the catalogue).
 */
export const createRequestSchema = z.object({
  service: z.string().trim().min(1, "Choose a service").max(64),
  addressId: z.uuid("Choose an address"),
  preferredDate: preferredDateSchema,
  preferredTime: z.enum(preferredTimes),
  details: z.string().trim().min(10, "Add a few words about what you need (at least 10 characters).").max(1000, "Keep it under 1000 characters."),
});
export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const cancelRequestSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const listRequestsQuerySchema = z.object({
  status: z.enum(requestStatuses).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type RequestAddressSnapshot = Pick<Address, "label" | "line1" | "line2" | "landmark" | "city" | "state" | "pincode">;

export type ServiceRequest = {
  id: string;
  /** @homecare/catalog service slug */
  service: string;
  status: RequestStatus;
  details: string;
  preferredDate: string;
  preferredTime: PreferredTime;
  /** Address as it was when the request was sent (survives address edits/deletion). */
  address: RequestAddressSnapshot;
  addressId: string | null;
  canCancel: boolean;
  cancelReason: string | null;
  /** Scheduled appointment once assigned (null while under review or after cancellation). */
  appointment: Appointment | null;
  createdAt: string;
  updatedAt: string;
};

export type RequestEventActor = "customer" | "staff" | "system" | "professional";

export type RequestEvent = {
  id: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actor: RequestEventActor;
  note: string | null;
  createdAt: string;
};

export type Page<T> = { items: T[]; nextCursor: string | null };

// ─────────────────────────────────────────────────────────────────────────────
// Envelope & errors
// ─────────────────────────────────────────────────────────────────────────────

/** Every successful response: { data }. Every error: { error }. */
export type ApiSuccess<T> = { data: T };

export const apiErrorCodes = [
  "validation_failed",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "otp_invalid",
  "otp_cooldown",
  "session_expired",
  "invalid_service",
  "profile_incomplete",
  "request_not_cancellable",
  "invalid_transition",
  "not_eligible",
  "assignment_conflict",
  "affects_assignments",
  "profile_required",
  "internal_error",
  "service_unavailable",
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    /** Field-level validation messages, keyed by dotted path. */
    fields?: Record<string, string>;
    /** Seconds to wait before retrying (rate limits / OTP cooldown). */
    retryAfterSeconds?: number;
    requestId?: string;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export const notificationTypes = [
  "request_received",
  "request_assigned",
  "appointment_confirmed",
  "appointment_rescheduled",
  "request_cancelled",
  "service_completed",
] as const;
export type NotificationType = (typeof notificationTypes)[number];

export const notificationChannels = ["in_app", "push", "sms"] as const;
export type NotificationChannel = (typeof notificationChannels)[number];

/**
 * Delivery state per channel. "available" = stored and visible in the app's notification list
 * (in-app only). "skipped" = no provider configured — never reported as sent.
 */
export const deliveryStatuses = ["available", "queued", "sent", "failed", "skipped"] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export type NotificationDelivery = { channel: NotificationChannel; status: DeliveryStatus; detail: string | null; updatedAt: string };

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  requestId: string | null;
  readAt: string | null;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Staff, roles & permissions (admin dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export const staffRoles = ["super_admin", "operations_admin", "operations_staff", "support_staff"] as const;
export type StaffRole = (typeof staffRoles)[number];
export const staffRoleLabels: Record<StaffRole, string> = {
  super_admin: "Super admin",
  operations_admin: "Operations admin",
  operations_staff: "Operations staff",
  support_staff: "Support staff",
};

export const permissions = [
  "overview.read",
  "requests.read",
  "requests.assign", // assign, reassign, reschedule
  "requests.confirm",
  "requests.progress", // start, complete
  "requests.cancel",
  "customers.read",
  "professionals.read",
  "professionals.write", // create, edit categories/areas/availability
  "professionals.verify",
  "professionals.status", // suspend / activate / deactivate
  "services.read",
  "services.write",
  "audit.read",
  "staff.manage",
] as const;
export type Permission = (typeof permissions)[number];

/** Role → permissions. The backend enforces these; the dashboard only uses them to hide controls. */
export const rolePermissions: Record<StaffRole, readonly Permission[]> = {
  super_admin: permissions,
  operations_admin: permissions.filter((p) => p !== "staff.manage"),
  operations_staff: [
    "overview.read",
    "requests.read",
    "requests.assign",
    "requests.confirm",
    "requests.progress",
    "customers.read",
    "professionals.read",
    "professionals.write",
    "services.read",
  ],
  support_staff: ["overview.read", "requests.read", "requests.cancel", "customers.read", "professionals.read", "services.read"],
};
export const hasPermission = (role: StaffRole, permission: Permission) => rolePermissions[role].includes(permission);

export const staffStatuses = ["active", "disabled"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export type StaffProfile = {
  id: string;
  fullName: string;
  phone: string;
  role: StaffRole;
  status: StaffStatus;
  permissions: Permission[];
  createdAt: string;
};

export type AdminSession = { accessToken: string; accessTokenExpiresIn: number; staff: StaffProfile };

export const createStaffSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  role: z.enum(staffRoles),
});
export const updateStaffSchema = z
  .object({ role: z.enum(staffRoles), status: z.enum(staffStatuses), fullName: z.string().trim().min(2).max(80) })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

// ─────────────────────────────────────────────────────────────────────────────
// Professionals
// ─────────────────────────────────────────────────────────────────────────────

export const verificationStatuses = ["pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];
export const accountStatuses = ["active", "suspended", "inactive"] as const;
export type AccountStatus = (typeof accountStatuses)[number];
export const availabilityStatuses = ["available", "unavailable"] as const;
export type AvailabilityStatus = (typeof availabilityStatuses)[number];

/** 0 = Sunday … 6 = Saturday (dates are interpreted in India time). */
export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const pincodeSchema = z.string().trim().regex(/^[1-9]\d{5}$/, "Enter valid 6-digit pincodes");
const availabilitySlotSchema = z.object({ weekday: z.number().int().min(0).max(6), slot: z.enum(timeSlots) });

const professionalFields = {
  fullName: z.string().trim().min(2, "Enter the full name").max(80),
  phone: phoneSchema,
  /** @homecare/catalog category ids (validated by the API) */
  categories: z.array(z.string().trim().min(1)).min(1, "Choose at least one service category").max(10),
  /** Serviceable pincodes — entered by staff, never inferred */
  pincodes: z.array(pincodeSchema).min(1, "Add at least one serviceable pincode").max(200),
  availability: z.array(availabilitySlotSchema).max(21),
  availabilityStatus: z.enum(availabilityStatuses),
  notes: z.string().trim().max(500).optional().nullable(),
};

export const createProfessionalSchema = z.object({
  ...professionalFields,
  availability: professionalFields.availability.default([]),
  availabilityStatus: professionalFields.availabilityStatus.default("available"),
});
export type CreateProfessionalInput = z.input<typeof createProfessionalSchema>;

export const updateProfessionalSchema = z
  .object(professionalFields)
  .omit({ phone: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export type UpdateProfessionalInput = z.input<typeof updateProfessionalSchema>;

export const setVerificationSchema = z.object({
  status: z.enum(["verified", "rejected"]),
  note: z.string().trim().max(300).optional(),
});
export const setAccountStatusSchema = z.object({
  status: z.enum(accountStatuses),
  reason: z.string().trim().min(3, "Give a reason").max(300),
});

export type ProfessionalSummary = {
  id: string;
  fullName: string;
  phone: string;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  availabilityStatus: AvailabilityStatus;
  categories: string[];
  pincodes: string[];
  createdAt: string;
};

export type Professional = ProfessionalSummary & {
  availability: { weekday: number; slot: TimeSlot }[];
  notes: string | null;
  verifiedAt: string | null;
  /** Upcoming active assignments */
  upcoming: { requestId: string; service: string; date: string; slot: TimeSlot; status: RequestStatus }[];
  documents: { configured: boolean; count: number };
  /** Signed in to the Homecare Pro app with this phone number */
  appLinked: boolean;
  /** Open alerts on this professional's bookings */
  openAlerts: OperationsAlert[];
  updatedAt: string;
};

export const listProfessionalsQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(40).optional(),
  pincode: z.string().trim().max(6).optional(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  accountStatus: z.enum(accountStatuses).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Why a professional can't take a request. */
export const ineligibilityReasons = [
  "not_verified",
  "not_active",
  "unavailable",
  "category_mismatch",
  "area_mismatch",
  "not_working_that_slot",
  "schedule_conflict",
] as const;
export type IneligibilityReason = (typeof ineligibilityReasons)[number];
export const ineligibilityLabels: Record<IneligibilityReason, string> = {
  not_verified: "Not verified",
  not_active: "Account not active",
  unavailable: "Marked unavailable",
  category_mismatch: "Doesn't offer this category",
  area_mismatch: "Doesn't serve this pincode",
  not_working_that_slot: "Not working that day/slot",
  schedule_conflict: "Already booked for that slot",
};

export type EligibilityCandidate = { professional: ProfessionalSummary; eligible: boolean; reasons: IneligibilityReason[] };
export type EligibilityResult = { date: string; slot: TimeSlot; category: string; pincode: string; candidates: EligibilityCandidate[] };

export const eligibilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: z.enum(timeSlots).optional(),
  category: z.string().trim().max(40).optional(),
  includeIneligible: z.enum(["true", "false"]).transform((v) => v === "true").default(false),
});

// ─────────────────────────────────────────────────────────────────────────────
// Request operations (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const requestActions = ["assign", "reassign", "confirm", "reschedule", "start", "complete", "cancel"] as const;
export type RequestAction = (typeof requestActions)[number];

const scheduleDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date").refine((d) => d >= todayInIndia(), "Choose today or a later date");

export const assignSchema = z.object({ professionalId: z.uuid(), date: scheduleDate, slot: z.enum(timeSlots), note: z.string().trim().max(300).optional() });
export const reassignSchema = assignSchema.extend({ reason: z.string().trim().min(3, "Give a reason").max(300) });
export const rescheduleSchema = z.object({ date: scheduleDate, slot: z.enum(timeSlots), reason: z.string().trim().min(3, "Give a reason").max(300) });
export const transitionNoteSchema = z.object({ note: z.string().trim().max(300).optional() });
export const staffCancelSchema = z.object({ reason: z.string().trim().min(3, "Give a reason").max(300) });

export const adminRequestListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(requestStatuses).optional(),
  service: z.string().trim().max(64).optional(),
  category: z.string().trim().max(40).optional(),
  dateField: z.enum(["created", "preferred"]).default("created"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type Paged<T> = { items: T[]; total: number; page: number; pageSize: number };

export type AdminCustomerRef = { id: string; fullName: string | null; phone: string };

export type AdminRequestListItem = ServiceRequest & { customer: AdminCustomerRef; professional: { id: string; fullName: string } | null };

export type AssignmentRecord = {
  id: string;
  professional: { id: string; fullName: string; phone: string };
  /** When the professional acknowledged it in the Pro app */
  acknowledgedAt: string | null;
  date: string;
  slot: TimeSlot;
  status: "active" | "replaced" | "cancelled" | "completed";
  assignedBy: string | null;
  endReason: string | null;
  createdAt: string;
  endedAt: string | null;
};

export type AdminRequestEvent = RequestEvent & { actorName: string | null };

export type AdminRequestDetail = {
  request: ServiceRequest;
  customer: AdminCustomerRef & { email: string | null; createdAt: string; requestCount: number };
  events: AdminRequestEvent[];
  assignments: AssignmentRecord[];
  notifications: (AppNotification & { deliveries: NotificationDelivery[] })[];
  /** Actions valid for the request's current state AND the caller's permissions. */
  allowedActions: RequestAction[];
  /** Open and past operations alerts for this request (e.g. professional suspended) */
  alerts: OperationsAlert[];
};

export const overviewQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().trim().max(40).optional(),
});

export type Overview = {
  range: { from: string | null; to: string | null; category: string | null };
  counts: Record<RequestStatus, number>;
  total: number;
  /** Oldest request still under review (ISO), if any */
  oldestPendingAt: string | null;
  professionals: { verified: number; pendingVerification: number; activeAndAvailable: number };
  /** Open operations alerts (bookings that need reassignment or cancellation) */
  openAlerts: number;
  recentActivity: { id: string; requestId: string; service: string; customerName: string | null; fromStatus: RequestStatus | null; toStatus: RequestStatus; actor: RequestEventActor; actorName: string | null; createdAt: string }[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Customers, services, audit (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const adminCustomerListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminCustomerListItem = AdminCustomerRef & { email: string | null; createdAt: string; requestCount: number; addressCount: number };
export type AdminCustomerDetail = AdminCustomerListItem & { addresses: Address[]; requests: ServiceRequest[] };

export type AdminServiceRow = { slug: string; name: string; category: string; enabled: boolean; updatedAt: string | null; updatedBy: string | null };
export const updateServiceSettingSchema = z.object({ enabled: z.boolean(), reason: z.string().trim().max(300).optional() });

export const auditQuerySchema = z.object({
  resourceType: z.string().trim().max(40).optional(),
  resourceId: z.string().trim().max(64).optional(),
  action: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type AuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  actor: { staffId: string; name: string; role: StaffRole } | null;
  /** Set when the action was taken by a professional in the Pro app */
  professionalName?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Professional app (Homecare Pro)
// ─────────────────────────────────────────────────────────────────────────────

/** Self-registration from the Pro app. Always created as verification = pending. */
export const registerProfessionalSchema = z.object({
  fullName: professionalFields.fullName,
  categories: professionalFields.categories,
  pincodes: professionalFields.pincodes,
  availability: professionalFields.availability.default([]),
});
export type RegisterProfessionalInput = z.input<typeof registerProfessionalSchema>;

/** What a professional may change about themselves. Verification and account status are staff-only. */
export const updateMyProfessionalSchema = z
  .object({
    fullName: professionalFields.fullName,
    categories: professionalFields.categories,
    pincodes: professionalFields.pincodes,
    availability: professionalFields.availability,
    availabilityStatus: professionalFields.availabilityStatus,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });
export type UpdateMyProfessionalInput = z.input<typeof updateMyProfessionalSchema>;

export type MyProfessionalProfile = {
  id: string;
  fullName: string;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  availabilityStatus: AvailabilityStatus;
  categories: string[];
  pincodes: string[];
  availability: { weekday: number; slot: TimeSlot }[];
  verifiedAt: string | null;
  createdAt: string;
};

export type ProMe = {
  phone: string;
  /** null until the professional completes registration in the app */
  professional: MyProfessionalProfile | null;
  documents: { storageConfigured: boolean; count: number };
};

export type ProSession = AuthTokens & { me: ProMe };

export const proJobScopes = ["upcoming", "completed", "cancelled", "all"] as const;
export type ProJobScope = (typeof proJobScopes)[number];
export const proJobsQuerySchema = z.object({ scope: z.enum(proJobScopes).default("upcoming") });

/**
 * A job from the professional's point of view (one assignment).
 *   awaiting_confirmation = assigned, Homecare still confirming with the customer
 *   reassigned = no longer this professional's job
 */
export type ProJobState = "awaiting_confirmation" | "confirmed" | "in_progress" | "completed" | "cancelled" | "reassigned";
export type ProJobAction = "acknowledge" | "start" | "complete";

export type ProJob = {
  id: string;
  requestId: string;
  service: string;
  state: ProJobState;
  date: string;
  slot: TimeSlot;
  assignedAt: string;
  acknowledgedAt: string | null;
  /** Work details and address are shown only while the job is (or was completed as) theirs */
  details: string | null;
  address: RequestAddressSnapshot | null;
  preferredDate: string;
  preferredTime: PreferredTime;
  /** First name always; phone only once the appointment is confirmed and until it's completed */
  customer: { firstName: string; phone: string | null } | null;
  /** Actions the API will accept right now */
  actions: ProJobAction[];
  /** Why start isn't available yet, e.g. "Available on the appointment date" */
  startBlockedReason: string | null;
};

export const jobNoteSchema = z.object({ note: z.string().trim().max(300).optional() });

export const proNotificationTypes = ["job_assigned", "job_confirmed", "job_rescheduled", "job_cancelled", "job_reminder", "job_completed"] as const;
export type ProNotificationType = (typeof proNotificationTypes)[number];

/** Earnings: payments aren't implemented in the backend yet, so nothing is estimated or invented. */
export type ProEarnings = { status: "not_available"; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Operations alerts (milestone 5)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A booking operations must act on. "professional_unavailable" is raised when a professional with
 * upcoming assigned/confirmed jobs is suspended or deactivated. It is resolved only by reassigning
 * or cancelling the booking, or by reactivating the professional — never silently.
 */
export type OperationsAlert = {
  id: string;
  kind: "professional_unavailable";
  status: "open" | "resolved";
  message: string;
  requestId: string;
  assignmentId: string;
  service: string;
  date: string;
  slot: TimeSlot;
  professional: { id: string; fullName: string };
  resolution: "reassigned" | "cancelled" | "professional_reactivated" | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export const alertsQuerySchema = z.object({ status: z.enum(["open", "resolved"]).default("open") });

/** Response of the account-status action: what still needs handling. */
export type AccountStatusResult = Professional & { activeAssignments: number; affectedBookings: OperationsAlert[] };
