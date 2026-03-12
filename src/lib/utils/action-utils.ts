export type ActionResult<T = void> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};

/**
 * A wrapper for Server Actions to provide a standardized response format
 * and automatic error catching.
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  successMessage = "Success",
  errorMessage = "An unexpected error occurred"
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return {
      success: true,
      message: successMessage,
      data,
    };
  } catch (err) {
    console.error("Action error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : errorMessage,
      error: String(err),
    };
  }
}
