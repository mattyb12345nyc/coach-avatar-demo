// Prompt for microphone access BEFORE starting the LiveAvatar session.
// This must be called synchronously from a user gesture (button click)
// so iOS Safari treats it as user-initiated. Once granted, the LiveAvatar
// SDK's internal getUserMedia call will reuse the permission without
// re-prompting, so the avatar connection and mic permission don't race.
export async function requestMicPermission(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error(
      "This browser does not expose getUserMedia. Try Chrome or Safari.",
    );
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Release the temporary stream immediately — the LiveAvatar SDK
    // will create its own audio track once the session starts.
    stream.getTracks().forEach((track) => track.stop());
  } catch (err) {
    const e = err as DOMException;
    if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
      throw new Error(
        "Microphone access is required for the practice session. Enable it in your browser settings and try again.",
      );
    }
    if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
      throw new Error(
        "No microphone detected. Plug one in or check your system audio settings.",
      );
    }
    throw new Error(`Could not access microphone: ${e.message || e.name}`);
  }
}
