import { Platform } from "react-native";

const FACEBOOK_APP_ID = "2523000324801063";
const FACEBOOK_CLIENT_TOKEN = "29e34580a6f694670c0f310d46392c3f";

let _initialized = false;

/**
 * Initializes the Facebook SDK.
 * Must be called once at app startup before any other SDK calls.
 * Safe to call on web (no-op) and guarded against double-initialization.
 */
export async function initFacebook(): Promise<void> {
  if (Platform.OS === "web" || _initialized) return;

  try {
    const { Settings } = await import("react-native-fbsdk-next");
    Settings.setAppID(FACEBOOK_APP_ID);
    Settings.setClientToken(FACEBOOK_CLIENT_TOKEN);
    Settings.initializeSDK();
    _initialized = true;
  } catch (e) {
    console.warn("[Facebook] SDK initialization failed:", e);
  }
}

/**
 * Logs an app activation event (equivalent to "App Open" / session start).
 * Should be called once after SDK initialization.
 * Note: autoLogAppEventsEnabled in app.json also handles this automatically
 * in native builds — this call ensures it is recorded even in edge cases.
 */
export async function logAppActivation(): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const { AppEventsLogger } = await import("react-native-fbsdk-next");
    // Use the standard logEvent with the built-in activated_app event name
    AppEventsLogger.logEvent("fb_mobile_activate_app");
  } catch (e) {
    console.warn("[Facebook] logAppActivation failed:", e);
  }
}

/**
 * Logs a screen view event so Facebook Ads Manager can attribute
 * in-app navigation to ad campaigns.
 */
export async function logScreenView(screenName: string): Promise<void> {
  if (Platform.OS === "web" || !screenName) return;

  try {
    const { AppEventsLogger } = await import("react-native-fbsdk-next");
    AppEventsLogger.logEvent("fb_mobile_content_view", {
      fb_content_type: "screen",
      fb_content_id: screenName,
    });
  } catch (e) {
    console.warn("[Facebook] logScreenView failed:", e);
  }
}
