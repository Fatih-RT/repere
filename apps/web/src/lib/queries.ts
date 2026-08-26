import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientResponseError, type RecordModel } from "pocketbase";
import { pb } from "./pb";
import { useAuth } from "./auth";
import { DEFAULT_SETTINGS, type AppUser, type UserSettings } from "./types";

function toAppUser(record: RecordModel): AppUser {
  return {
    id: record.id,
    email: record.email ?? "",
    name: record.name ?? "",
    class_name: record.class_name ?? "",
    avatar: record.avatar ?? "",
  };
}

async function ensureUserSettings(userId: string): Promise<UserSettings> {
  try {
    return await pb.collection("user_settings").getFirstListItem<UserSettings>(pb.filter("user = {:id}", { id: userId }));
  } catch (err) {
    if (!(err instanceof ClientResponseError) || err.status !== 404) throw err;
    // No settings row yet (fresh account) — create one with the app defaults.
    return pb.collection("user_settings").create<UserSettings>({ user: userId, ...DEFAULT_SETTINGS });
  }
}

export function useLogin() {
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const auth = await pb.collection("users").authWithPassword(email, password);
      await ensureUserSettings(auth.record.id);
      return toAppUser(auth.record);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string; displayName: string; className?: string }) => {
      await pb.collection("users").create({
        email: data.email,
        password: data.password,
        passwordConfirm: data.password,
        name: data.displayName,
        class_name: data.className ?? "",
      });
      const auth = await pb.collection("users").authWithPassword(data.email, data.password);
      await ensureUserSettings(auth.record.id);
      return toAppUser(auth.record);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      pb.authStore.clear();
    },
  });
}

export function useUpdateMe() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { displayName?: string; className?: string }) => {
      const record = await pb.collection("users").update(user!.id, {
        name: data.displayName,
        class_name: data.className,
      });
      return toAppUser(record);
    },
  });
}

export function useChangePassword() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      pb.collection("users").update(user!.id, {
        oldPassword: currentPassword,
        password: newPassword,
        passwordConfirm: newPassword,
      }),
  });
}

export function useSettings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: () => ensureUserSettings(user!.id),
    enabled: !!user,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      const existing = await ensureUserSettings(user!.id);
      return pb.collection("user_settings").update<UserSettings>(existing.id, data);
    },
    onSuccess: (settings) => qc.setQueryData(["user_settings", user?.id], settings),
  });
}
