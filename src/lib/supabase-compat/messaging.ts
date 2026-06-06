/* eslint-disable @typescript-eslint/no-explicit-any */
export const getMessaging = () => {
  if (typeof window === "undefined") return null;
  return {
    type: "fcm_mock"
  };
};

export const getToken = async (messaging: any, options: any) => {
  console.log("[SUPABASE_COMPAT] Mock FCM Token requested");
  return "rt_mock_fcm_token_" + Math.random().toString(36).substring(2, 12);
};

export const onMessage = (messaging: any, callback: (payload: any) => void) => {
  console.log("[SUPABASE_COMPAT] Mock FCM onMessage listener registered");
  return () => {};
};
