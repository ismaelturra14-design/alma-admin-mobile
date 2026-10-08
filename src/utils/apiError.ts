const TECHNICAL_PATTERNS = [
  "AxiosError",
  "Bad Request",
  "Internal Server Error",
  "TypeError",
  "Cannot read properties",
  "stack trace",
  "stack",
  "JSON completo",
  "response.data",
  "undefined",
  "Error: ",
  "InternalError",
  "Unexpected error",
];

function isTechnicalMessage(message: string): boolean {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return true;
  }

  return TECHNICAL_PATTERNS.some((pattern) => normalized.toLowerCase().includes(pattern.toLowerCase()));
}

function readMessageFromPayload(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  if ("message" in payload) {
    const message = payload.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
    if (Array.isArray(message)) {
      const combined = message
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .join(" ");
      if (combined) {
        return combined;
      }
    }
  }

  if ("error" in payload) {
    const error = payload.error;
    if (typeof error === "string" && error.trim()) {
      return error.trim();
    }
  }

  return undefined;
}

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = "response" in error ? error.response : undefined;
    if (maybeResponse && typeof maybeResponse === "object") {
      const payload = "data" in maybeResponse ? maybeResponse.data : undefined;
      const message = readMessageFromPayload(payload);
      if (message) {
        if (isTechnicalMessage(message)) {
          return fallback;
        }
        return message;
      }
    }

    const directMessage = readMessageFromPayload(error);
    if (directMessage) {
      if (isTechnicalMessage(directMessage)) {
        return fallback;
      }
      return directMessage;
    }
  }

  if (error instanceof Error && error.message && !isTechnicalMessage(error.message)) {
    return error.message;
  }

  return fallback;
}
