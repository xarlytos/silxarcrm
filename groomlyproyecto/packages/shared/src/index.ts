// Types
export * from './types/api';

// API
export { createApi, getApi, extractErrorMessage } from './api/client';
export type { ApiConfig, ApiErrorResponse } from './api/client';

// Stores
export { createAuthStore, selectIsAuthenticated, selectCurrentMembership } from './stores/authStore';
export type { AuthState, AuthStore, AuthStoreOptions } from './stores/authStore';

// Hooks
export { useAuth } from './hooks/useAuth';
export type { UseAuthOptions } from './hooks/useAuth';
export { useSalon } from './hooks/useSalon';
export type { UseSalonOptions } from './hooks/useSalon';

// Lib
export { queryClient } from './lib/queryClient';
export { queryClient as persistedQueryClient, asyncStoragePersister } from './lib/persistedQueryClient';
export * from './lib/date';
export * from './lib/pricing';
export * from './lib/petLabels';
export { cn } from './lib/cn';

// Services
export * as authService from './services/auth.service';
export * as customersService from './services/customers.service';
export * as petsService from './services/pets.service';
export * as appointmentsService from './services/appointments.service';
export * as groomersService from './services/groomers.service';
export * as servicesService from './services/services.service';
export * as financeService from './services/finance.service';
export * as invoicesService from './services/invoices.service';
export * as expensesService from './services/expenses.service';
export { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from './services/expenses.service';
export * as notificationsService from './services/notifications.service';
export * as commissionsService from './services/commissions.service';
export * as inventoryService from './services/inventory.service';
