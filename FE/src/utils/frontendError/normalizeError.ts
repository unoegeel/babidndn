import type { RelatedRequestIdCarrier } from "../../types/clientError";

export interface NormalizedClientError {
  errorName: string;
  message: string;
  stack?: string;
  relatedRequestId?: string;
}

export function isRelatedRequestIdCarrier(value: unknown): value is RelatedRequestIdCarrier {
  return typeof value === "object"
    && value !== null
    && "relatedRequestId" in value;
}

export function extractRelatedRequestId(reason: unknown): string | undefined {
  if (isRelatedRequestIdCarrier(reason)) {
    const id = reason.relatedRequestId;
    return typeof id === "string" && id.trim() !== "" ? id.trim() : undefined;
  }
  return undefined;
}

export function normalizeUnknownError(reason: unknown): NormalizedClientError {
  if (reason instanceof Error) {
    return {
      errorName: reason.name || "Error",
      message: reason.message || reason.name || "Unknown error",
      stack: reason.stack,
      relatedRequestId: extractRelatedRequestId(reason),
    };
  }

  if (typeof reason === "string") {
    return {
      errorName: "Error",
      message: reason,
    };
  }

  if (typeof reason === "object" && reason !== null) {
    const maybeMessage = "message" in reason && typeof reason.message === "string"
      ? reason.message
      : undefined;
    return {
      errorName: "Error",
      message: maybeMessage ?? "Non-Error rejection",
      relatedRequestId: extractRelatedRequestId(reason),
    };
  }

  return {
    errorName: "Error",
    message: String(reason),
  };
}

export function normalizeErrorEvent(error: unknown, fallbackMessage?: string): NormalizedClientError {
  if (error instanceof Error) {
    return {
      errorName: error.name || "Error",
      message: error.message || fallbackMessage || error.name || "Unknown error",
      stack: error.stack,
      relatedRequestId: extractRelatedRequestId(error),
    };
  }

  if (fallbackMessage) {
    return {
      errorName: "Error",
      message: fallbackMessage,
    };
  }

  return normalizeUnknownError(error);
}
