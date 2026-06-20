export type Role = 'OWNER' | 'MANAGER' | 'GROOMER' | 'RECEPTIONIST' | 'CUSTOMER';

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export type Plan = 'starter' | 'pro' | 'business';

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  isPlatformAdmin: boolean;
  emailVerified: boolean;
}

export interface Salon {
  id: string;
  name: string;
  slug: string;
  settings: {
    language: string;
    timezone: string;
    currency: string;
    openingHours: Record<string, unknown> | null;
    bookingSettings: Record<string, unknown> | null;
  } | null;
}

export interface SalonSummary {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
}

export interface Membership {
  id: string;
  role: Role;
  salon: SalonSummary;
}

export interface AuthResponse {
  token: string;
  user: User;
  memberships: Membership[];
}

export interface AcceptInviteResponse extends AuthResponse {
  salonId: string;
}

export interface InvitePreview {
  valid: boolean;
  reason?: 'not-found' | 'expired' | 'consumed' | 'inactive';
  email?: string;
  salonName?: string;
  role?: Role;
  invitedBy?: string;
  expiresAt?: string;
  alreadyActive?: boolean;
  needsPassword?: boolean;
}

export interface MeResponse {
  user: User;
  memberships: Membership[];
}

export interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt?: string | null;
  current?: boolean;
}

export interface PlatformDashboard {
  totalSalons: number;
  activeSalons: number;
  totalUsers: number;
  trialsEndingSoon: number;
  mrr: number;
  churnRate: number;
  revenueByPlan: { plan: string; count: number; revenue: number; priceMonthly: number }[];
  revenueHistory: { month: string; revenue: number }[];
  salonsByPlan: { plan: Plan | string; count: number }[];
}

export interface PlatformSalonItem {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  ownerUserId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { salonUsers: number };
}

export interface PlatformSalonDetail extends PlatformSalonItem {
  salonUsers: {
    id: string;
    role: Role;
    status: string;
    createdAt: string;
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
  }[];
  settings: {
    id: string;
    language: string;
    timezone: string;
    currency: string;
    primaryColor: string | null;
    logoUrl: string | null;
  } | null;
  _count?: { salonUsers: number; auditLogs: number };
}

export interface PlatformUserItem {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isPlatformAdmin: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  _count: { salonUsers: number };
}

export interface PlatformSubscriptionItem {
  plan: Plan;
  status: SubscriptionStatus;
  count: number;
}

export interface PlatformAuditEntry {
  id: string;
  salonId: string | null;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  salon?: { id: string; name: string; slug: string } | null;
}

export interface PlatformRevenueResponse {
  months: number;
  mrr: number;
  history: { month: string; revenue: number }[];
  byPlan: { plan: string; count: number; revenue: number; priceMonthly: number }[];
}

export interface BillingPlan {
  id: Plan;
  name: string;
  priceMonthly: number;
  currency: string;
  maxAppointmentsPerMonth: number | null;
  maxGroomers: number | null;
  features: string[];
  description: string;
  highlights: string[];
  current: boolean;
  stripeConfigured: boolean;
}

export interface BillingPlansResponse {
  data: BillingPlan[];
  stripeEnabled: boolean;
  subscription: {
    plan: Plan;
    status: SubscriptionStatus | string;
    trialDays: number | null;
    currentPeriodEnd: string | null;
  } | null;
}

export interface BillingInvoice {
  id: string;
  number: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  created: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface OnboardingResponse {
  salon: {
    id: string;
    name: string;
    slug: string;
    plan: Plan;
    subscriptionStatus: SubscriptionStatus;
  };
  memberships: Membership[];
}

// ──────────────────────────────────────────────
// Negocio: Clientes y Mascotas
// ──────────────────────────────────────────────

export type CustomerStatus = 'active' | 'inactive' | 'archived';

export interface Customer {
  id: string;
  salonId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  notes: string | null;
  avatarUrl: string | null;
  dniNif: string | null;
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingWhatsapp: boolean;
  privacyAccepted: boolean;
  status: CustomerStatus;
  loyaltyPoints: number;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { pets: number };
  pets?: Pet[];
}

export type PetSize = 'xs' | 's' | 'm' | 'l' | 'xl';
export type PetSex = 'male' | 'female';
export type PetCoat = 'short' | 'medium' | 'long' | 'curly' | 'wire';
export type PetStatus = 'active' | 'archived';

export interface Pet {
  id: string;
  salonId: string;
  name: string;
  breed: string | null;
  size: PetSize;
  sex: PetSex | null;
  birthDate: string | null;
  coatType: PetCoat | null;
  weightKg: number | null;
  color: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  behaviorNotes: string | null;
  groomingNotes: string | null;
  photoUrl: string | null;
  status: PetStatus;
  ownerCustomerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: Pick<Customer, 'id' | 'fullName' | 'email' | 'phone' | 'city'>;
}

export type ServiceCategory =
  | 'bath'
  | 'haircut'
  | 'nails'
  | 'deshedding'
  | 'spa'
  | 'teeth'
  | 'other';

export interface ServiceAddon {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  durationExtraMinutes: number;
  active: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  category: ServiceCategory;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  variablePrice: boolean;
  priceSmall: number | null;
  priceMedium: number | null;
  priceLarge: number | null;
  priceXLarge: number | null;
  color: string | null;
  icon: string | null;
  photoUrl: string | null;
  commissionPercent: number | null;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  addons?: ServiceAddon[];
}

export interface ServiceCategoryMeta {
  value: ServiceCategory;
  label: string;
  icon: string;
  suggestedColor: string;
}

export interface ServiceTemplate {
  name: string;
  description?: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  variablePrice: boolean;
  priceSmall?: number;
  priceMedium?: number;
  priceLarge?: number;
  priceXLarge?: number;
  color?: string;
  order: number;
}

export interface ServiceKpis {
  bookingsCount: number;
  completedCount: number;
  revenueGenerated: number;
  averagePrice: number;
  groomersTop: { id: string; name: string; count: number }[];
  bookingsByMonth: { month: string; count: number }[];
}

// ──────────────────────────────────────────────
// Citas y Personal
// ──────────────────────────────────────────────

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type AppointmentSource = 'manual' | 'portal' | 'walkin';

export interface AppointmentService {
  id: string;
  appointmentId: string;
  serviceId: string;
  addonId: string | null;
  serviceName: string;
  addonName: string | null;
  price: number;
  durationMinutes: number;
  notes: string | null;
}

export interface Appointment {
  id: string;
  salonId: string;
  customerId: string;
  petId: string;
  groomerId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  totalPrice: number;
  totalDurationMinutes: number;
  notes: string | null;
  internalNotes: string | null;
  cancelReason: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  source: AppointmentSource;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; fullName: string; phone: string | null; city?: string | null };
  pet?: {
    id: string;
    name: string;
    breed: string | null;
    size: PetSize;
    photoUrl?: string | null;
  };
  groomer?: { id: string; name: string; color: string | null } | null;
  services?: AppointmentService[];
  invoice?: { id: string; number: string; total: number; status: string } | null;
}

export interface Slot {
  startTime: string;
  endTime: string;
  groomerId: string;
  groomerName: string;
}

export interface Groomer {
  id: string;
  salonId: string;
  userId: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  specialties: string[] | null;
  languages: string[] | null;
  bio: string | null;
  photoUrl: string | null;
  color: string | null;
  active: boolean;
  maxDailyAppointments: number;
  commissionPercent: number | null;
  hireDate: string | null;
  weeksInRotation: number;
  rotationAnchorDate: string | null;
  createdAt: string;
  updatedAt: string;
  schedules?: GroomerSchedule[];
  timeOffs?: GroomerTimeOff[];
  _count?: { appointments: number };
  appointmentsToday?: number;
}

export interface GroomerKpis {
  appointmentsCount: number;
  completedCount: number;
  cancelledCount: number;
  noShowCount: number;
  revenueGenerated: number;
  commissionsTotal: number;
  occupancyRate: number | null;
  averageDurationMinutes: number;
}

export interface GroomerSchedule {
  id: string;
  groomerId: string;
  weekIndex: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
  breakStart: string | null;
  breakEnd: string | null;
  breakStart2: string | null;
  breakEnd2: string | null;
  createdAt: string;
}

export interface ScheduleException {
  id: string;
  groomerId: string;
  date: string;
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  breakStart2: string | null;
  breakEnd2: string | null;
  reason: string | null;
  createdAt: string;
}

export interface GroomerTimeOff {
  id: string;
  groomerId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  type: 'vacation' | 'sick' | 'other';
  createdAt: string;
}

// ──────────────────────────────────────────────
// Staff (SalonUser members)
// ──────────────────────────────────────────────

export type SalonUserStatus = 'invited' | 'active' | 'suspended' | 'removed';

export interface SalonUserMember {
  id: string;
  salonId: string;
  userId: string;
  role: Role;
  status: SalonUserStatus;
  permissions: string[] | null;
  hourlyRate: number | null;
  commissionRate: number | null;
  privateNotes: string | null;
  lastActiveAt: string | null;
  groomerProfile: {
    id: string;
    name: string;
    active: boolean;
    color: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    emailVerifiedAt: string | null;
  };
}

export interface PermissionTemplate {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberActivity {
  lastActiveAt: string | null;
  appointments: {
    thisMonth: number;
    completedTotal: number;
    noShow: number;
  };
  recentActions: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    createdAt: string;
    meta: unknown;
  }>;
}

export interface MemberAuditEntry {
  id: string;
  action: string;
  userId: string | null;
  meta: unknown;
  createdAt: string;
  author: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
}

export interface CheckEmailResponse {
  exists: boolean;
  hasName?: boolean;
  memberHere?: { status: SalonUserStatus; role: Role } | null;
  inOtherSalons?: number;
}

export interface ImportMembersRow {
  email: string;
  role: 'MANAGER' | 'GROOMER' | 'RECEPTIONIST';
  firstName?: string;
  lastName?: string;
  hourlyRate?: number | null;
  commissionRate?: number | null;
}

export interface ImportMembersResponse {
  summary: { total: number; invited: number; skipped: number; errors: number };
  results: Array<{
    row: number;
    email: string;
    status: 'invited' | 'skipped' | 'error';
    reason?: string;
  }>;
}

// ──────────────────────────────────────────────
// Comisiones
// ──────────────────────────────────────────────

export type CommissionStatus = 'pending' | 'paid' | 'cancelled';

export interface Commission {
  id: string;
  salonId: string;
  groomerId: string;
  appointmentId: string;
  amount: number;
  percentage: number;
  baseAmount: number;
  irpfRate: number | null;
  irpfAmount: number | null;
  netAmount: number | null;
  status: CommissionStatus;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  paymentReceiptUrl: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  groomer?: { id: string; name: string; color: string | null };
  appointment?: Appointment;
}

export interface CommissionSummaryRow {
  groomerId: string;
  groomerName: string;
  color: string | null;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
  cancelledAmount: number;
  appointments: number;
  revenue: number;
}

export interface CommissionSummary {
  totals: {
    totalAmount: number;
    pendingAmount: number;
    groomerCount: number;
  };
  byGroomer: CommissionSummaryRow[];
}

// ──────────────────────────────────────────────
// Reports
// ──────────────────────────────────────────────

export interface GroomerReportRow {
  groomerId: string;
  groomerName: string;
  groomerColor: string | null;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  totalCommission: number;
  averageAppointmentValue: number;
}

export interface GroomersReport {
  period: { start: string; end: string };
  data: GroomerReportRow[];
}

export interface GroomerDetailReport {
  period: { start: string; end: string };
  summary: GroomerReportRow | null;
  servicesBreakdown: { serviceName: string; count: number; revenue: number }[];
  dailyBreakdown: { date: string; appointments: number; revenue: number }[];
}

// ──────────────────────────────────────────────
// Facturas y pagos
// ──────────────────────────────────────────────

export type InvoiceStatus = 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type InvoiceType = 'normal' | 'rectificative' | 'proforma';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'stripe' | 'bizum' | 'other';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discountPercent: number | null;
  discountAmount: number;
  subtotal: number;
  total: number;
  serviceId: string | null;
  inventoryItemId: string | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  userId: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
  recordedBy?: { id: string; firstName: string | null; lastName: string | null } | null;
}

export interface Invoice {
  id: string;
  salonId: string;
  number: string;
  series: string;
  type: InvoiceType;
  originalInvoiceId: string | null;
  appointmentId: string | null;
  customerId: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountPercent: number | null;
  discountAmount: number;
  irpfRate: number | null;
  irpfAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  notes: string | null;
  paymentLinkUrl: string | null;
  customerNif: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  customerPostalCode: string | null;
  salonLegalName: string | null;
  salonCif: string | null;
  salonFiscalAddress: string | null;
  salonFiscalCity: string | null;
  salonFiscalPostalCode: string | null;
  emailSentAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; fullName: string; email?: string | null };
  lines?: InvoiceLine[];
  payments?: Payment[];
  appointment?: Appointment;
  originalInvoice?: { id: string; number: string } | null;
  rectifications?: { id: string; number: string; type: InvoiceType; total: number }[];
}

export interface SalonFiscal {
  id: string;
  name: string;
  legalName: string | null;
  cif: string | null;
  fiscalAddress: string | null;
  fiscalCity: string | null;
  fiscalPostalCode: string | null;
  fiscalCountry: string | null;
}

export interface SalonInvoiceSettings {
  invoicePrefix: string | null;
  defaultTaxRate: number;
  defaultIrpfRate: number | null;
  invoiceFooter: string | null;
}

export type WebTheme = 'modern' | 'warm' | 'minimal' | 'vibrant' | 'dark' | 'nature';

export type HeroLayout = 'split' | 'fullwidth' | 'centered' | 'minimal';

export interface WebSectionConfig {
  hero?: {
    enabled: boolean;
    title?: string;
    subtitle?: string;
    ctaText?: string;
    layout?: HeroLayout;
  };
  services?: { enabled: boolean; title?: string };
  hours?: { enabled: boolean; title?: string };
  contact?: { enabled: boolean; title?: string };
  socials?: { enabled: boolean; title?: string };
}

export interface SalonWebSettings {
  primaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  publicPageEnabled: boolean;
  description: string | null;
  publicPhone: string | null;
  publicEmail: string | null;
  publicAddress: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteUrl: string | null;
  coverImageUrl: string | null;
  theme: WebTheme | null;
  secondaryColor: string | null;
  accentColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  surfaceColor: string | null;
  sectionConfig: WebSectionConfig | null;
}

export interface UpdateSalonWebPayload {
  primaryColor?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  publicPageEnabled?: boolean;
  description?: string | null;
  publicPhone?: string | null;
  publicEmail?: string | null;
  publicAddress?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  websiteUrl?: string | null;
  coverImageUrl?: string | null;
  theme?: WebTheme | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  surfaceColor?: string | null;
  sectionConfig?: WebSectionConfig | null;
}

// ──────────────────────────────────────────────
// Gastos y transacciones
// ──────────────────────────────────────────────

export type ExpenseCategory =
  | 'products'
  | 'tools'
  | 'staff'
  | 'marketing'
  | 'rent'
  | 'utilities'
  | 'supplies'
  | 'accounting'
  | 'software'
  | 'insurance'
  | 'other';

export interface Expense {
  id: string;
  salonId: string;
  category: ExpenseCategory;
  amount: number;
  subtotal: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  paymentMethod: PaymentMethod | null;
  date: string;
  description: string;
  vendor: string | null;
  vendorId: string | null;
  vendorRef?: { id: string; name: string } | null;
  receiptUrl: string | null;
  recurringTemplateId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecurring {
  id: string;
  salonId: string;
  name: string;
  category: ExpenseCategory;
  amount: number;
  subtotal: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  paymentMethod: PaymentMethod | null;
  description: string;
  vendor: string | null;
  vendorId: string | null;
  vendorRef?: { id: string; name: string } | null;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  dayOfMonth: number;
  active: boolean;
  nextRunAt: string;
  lastGeneratedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  salonId: string;
  name: string;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  salonId: string;
  type: 'in' | 'out';
  category: 'service_sale' | 'product_sale' | 'expense' | 'commission' | 'other';
  concept: string;
  amount: number;
  date: string;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

// ──────────────────────────────────────────────
// Inventario
// ──────────────────────────────────────────────

export type InventoryCategory =
  | 'shampoo'
  | 'conditioner'
  | 'tools'
  | 'treatments'
  | 'perfume'
  | 'accessory'
  | 'other';

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'use';

export interface InventoryItem {
  id: string;
  salonId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  category: InventoryCategory;
  unitPrice: number;
  purchasePrice: number | null;
  stock: number;
  minStock: number;
  unit: 'unit' | 'ml' | 'l' | 'kg' | 'g' | 'dosis';
  photoUrl: string | null;
  expiryDate: string | null;
  batchNumber: string | null;
  vendorId: string | null;
  vendorRef?: { id: string; name: string } | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: StockMovementType;
  quantity: number;
  unitPrice: number | null;
  reference: string | null;
  notes: string | null;
  expenseId: string | null;
  createdAt: string;
}

export interface ServiceKitItem {
  id: string;
  serviceId: string;
  inventoryItemId: string;
  quantity: number;
  inventoryItem?: {
    id: string;
    name: string;
    unit: string;
    stock: number;
    minStock: number;
  };
}

export interface LowStockSuggestionGroup {
  vendor: { id: string | null; name: string; email: string | null };
  suggestions: Array<{
    inventoryItemId: string;
    name: string;
    currentStock: number;
    minStock: number;
    suggestedQuantity: number;
    unit: string;
    purchasePrice: number | null;
  }>;
}

// ──────────────────────────────────────────────
// Dashboard financiero
// ──────────────────────────────────────────────

export interface FinanceDashboard {
  period: { start: string; end: string };
  revenue: {
    total: number;
    services: number;
    products: number;
    vsPreviousPeriod: number;
  };
  pendingAmount: number;
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  profit: number;
  dailyRevenue: { date: string; amount: number }[];
  dailyExpenses: { date: string; amount: number }[];
  topServices: { name: string; revenue: number; count: number }[];
  recentInvoices: Invoice[];
}

export interface FinanceReport {
  period: { start: string; end: string };
  income: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  expenses: {
    total: number;
    byCategory: { category: string; amount: number }[];
  };
  net: number;
}

// ──────────────────────────────────────────────
// Portal y Comunicaciones
// ──────────────────────────────────────────────

export interface Notification {
  id: string;
  salonId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  salonId: string;
  customerId: string;
  appointmentId: string;
  rating: number;
  body: string | null;
  recommends: boolean;
  status: 'pending' | 'published' | 'hidden';
  response: string | null;
  createdAt: string;
  customer?: { fullName: string };
  appointment?: { date: string; startTime: string };
}

// ──────────────────────────────────────────────
// Fidelizacion, Paquetes y Extras
// ──────────────────────────────────────────────

export interface LoyaltyRule {
  id: string;
  salonId: string;
  name: string;
  serviceCategory: string | null;
  serviceId: string | null;
  pointsPerEuro: number;
  bonusMultiplier: number;
  minPurchase: number | null;
  active: boolean;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  points: number;
  type: string;
  appointmentId: string | null;
  reason: string;
  expiresAt: string | null;
  createdAt: string;
  customer?: { fullName: string };
}

export interface ServicePackage {
  id: string;
  salonId: string;
  name: string;
  description: string | null;
  services: { serviceId: string; quantity: number; serviceName: string }[];
  totalPrice: number;
  originalPrice: number;
  validityDays: number;
  active: boolean;
  createdAt: string;
}

export interface CustomerPackage {
  id: string;
  customerId: string;
  packageId: string;
  purchaseDate: string;
  validUntil: string;
  totalServices: number;
  usedServices: number;
  remainingServices: number;
  status: string;
  createdAt: string;
  package?: ServicePackage;
}

export interface Coupon {
  id: string;
  salonId: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  minPurchase: number | null;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageCount: number;
  active: boolean;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  salonId: string;
  customerId: string;
  petId: string | null;
  preferredDate: string | null;
  preferredTimeRange: string | null;
  services: { serviceId: string; serviceName: string }[];
  notes: string | null;
  status: 'waiting' | 'contacted' | 'converted' | 'removed';
  contactedAt: string | null;
  convertedToAppointmentId: string | null;
  createdAt: string;
  customer?: { fullName: string; phone: string | null };
}
