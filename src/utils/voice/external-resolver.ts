import { EXTERNAL_INTERACTION_TTL_MS } from "@/constants/external-voice";
import type {
  ExternalResolverErrorResponse,
  ExternalServiceName,
} from "@/types";

export function joinServiceUrl(baseUrl: string, endpoint: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`;
}

export function externalInteractionExpiryIso(now = Date.now()): string {
  return new Date(now + EXTERNAL_INTERACTION_TTL_MS).toISOString();
}

export function externalHttpError(
  status: number,
  service: ExternalServiceName,
): ExternalResolverErrorResponse {
  if (status === 401 || status === 403) {
    return {
      kind: "error",
      code: "api-key-rejected",
      message: "Hear! voice search is not authorised on this build.",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      kind: "error",
      code: "rate-limited",
      message:
        "There are too many voice searches right now. Please wait and try again.",
      retryable: true,
    };
  }
  if (status === 408 || status === 504) {
    return {
      kind: "error",
      code: "timeout",
      message: "Hear! search took too long. Please try again.",
      retryable: true,
    };
  }
  return {
    kind: "error",
    code:
      status >= 500
        ? `${service}-unavailable`
        : `${service}-request-rejected`,
    message:
      status >= 500
        ? `The Hear! ${service} service is unavailable right now. Please try again.`
        : `The Hear! ${service} request could not be completed.`,
    retryable: status >= 500,
  };
}

export function malformedExternalResponse(
  service: ExternalServiceName,
): ExternalResolverErrorResponse {
  return {
    kind: "error",
    code: `malformed-${service}-response`,
    message: `Hear! returned an invalid ${service} response. Please try again.`,
    retryable: true,
  };
}
