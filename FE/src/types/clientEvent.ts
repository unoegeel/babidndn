/** Backend ClientEventType enum과 동일 */
export type ClientEventType =
  | "MENU_VIEW"
  | "MENU_OPTION_OPEN"
  | "OPTION_SELECTED"
  | "ADD_TO_CART"
  | "CART_VIEW"
  | "CART_ITEM_UPDATED"
  | "CART_ITEM_REMOVED"
  | "CHECKOUT_VIEW"
  | "PAYMENT_START"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAIL"
  | "ORDER_CREATED"
  | "ORDER_STATUS_VIEW"
  | "ORDER_COMPLETED"
  | "SAVED_MENU_CREATED"
  | "SAVED_MENU_VIEW"
  | "SAVED_MENU_UPDATED"
  | "SAVED_MENU_DELETED"
  | "SAVED_MENU_REORDER"
  | "REVIEW_SUBMITTED"
  | "CONTACT_SUBMITTED";

export type ClientEventMetadata = Record<string, string | number | boolean | null>;

export interface ClientEventPayload {
  eventId: string;
  eventType: ClientEventType;
  timestamp: string;
  anonymousId: string;
  sessionId: string;
  route: string;
  relatedRequestId?: string;
  metadata?: ClientEventMetadata;
}

export interface TrackEventInput {
  type: ClientEventType;
  metadata?: ClientEventMetadata;
  route?: string;
  relatedRequestId?: string;
}

export const CLIENT_EVENT_API_PATH = "/api/client-events";

export const MAX_METADATA_KEYS = 20;
