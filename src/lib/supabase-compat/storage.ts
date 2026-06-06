/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./app";

export const getStorage = () => {
  return {
    type: "supabase_storage"
  };
};

export const ref = (storage: any, path: string) => {
  return {
    type: "storage_ref",
    path: path
  };
};

export const uploadString = async (storageRef: any, dataString: string, format?: string) => {
  console.log(`[SUPABASE_STORAGE] uploadString to path: ${storageRef.path}`);
  // Convert base64 to Blob
  const byteCharacters = atob(dataString);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "image/jpeg" });

  const cleanPath = storageRef.path.startsWith("/") ? storageRef.path.substring(1) : storageRef.path;
  const { data, error } = await supabase.storage.from("uploads").upload(cleanPath, blob, {
    upsert: true
  });
  if (error) {
    console.error("[SUPABASE_STORAGE] uploadString error:", error);
    throw new Error(error.message);
  }
  return data;
};

export const uploadBytes = async (storageRef: any, data: Blob | Uint8Array | ArrayBuffer) => {
  console.log(`[SUPABASE_STORAGE] uploadBytes to path: ${storageRef.path}`);
  const cleanPath = storageRef.path.startsWith("/") ? storageRef.path.substring(1) : storageRef.path;
  const { data: resData, error } = await supabase.storage.from("uploads").upload(cleanPath, data, {
    upsert: true
  });
  if (error) {
    console.error("[SUPABASE_STORAGE] uploadBytes error:", error);
    throw new Error(error.message);
  }
  return resData;
};

export const getDownloadURL = async (storageRef: any) => {
  const path = storageRef.path;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  const { data } = supabase.storage.from("uploads").getPublicUrl(cleanPath);
  return data.publicUrl;
};
