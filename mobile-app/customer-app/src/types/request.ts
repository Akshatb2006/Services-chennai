/**
 * Request types come from the shared API contract (@homecare/contracts), so the app and the
 * backend use the same status values and shapes. Names are kept from milestone 1.
 */
export {
  canCustomerCancel,
  preferredTimes,
  requestStatuses,
  type CreateRequestInput,
  type PreferredTime,
  type RequestEvent,
  type RequestStatus,
  type ServiceRequest,
} from "@homecare/contracts";

/** @deprecated use CreateRequestInput */
export type { CreateRequestInput as NewRequestInput } from "@homecare/contracts";
