/**
 * Maps `assistant_send_message_v1` failures to HTTP responses. The raw
 * Postgres message never reaches the client.
 */
export interface MappedError {
  status: 400 | 403 | 404 | 429 | 500;
  error: string;
}

export function mapAssistantRpcError(message: string): MappedError {
  if (message.includes("ASSISTANT_LIMIT_REACHED")) {
    return {
      status: 429,
      error:
        "You've used all your Startie messages for today. The counter resets at midnight UTC.",
    };
  }
  if (message.includes("THREAD_NOT_FOUND")) {
    return {
      status: 404,
      error:
        "That conversation isn't yours or no longer exists. Start a new chat.",
    };
  }
  if (message.includes("INVALID_CONTENT")) {
    return {
      status: 400,
      error: "Messages need at least one character and at most 2,000.",
    };
  }
  if (message.includes("NOT_AUTHENTICATED")) {
    return { status: 403, error: "Sign in again to talk to Startie." };
  }
  return {
    status: 500,
    error: "Startie couldn't take that message. Try again in a moment.",
  };
}
