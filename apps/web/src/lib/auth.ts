import { useSyncExternalStore } from "react";
import type { RecordModel } from "pocketbase";
import { pb } from "./pb";

// PocketBase's default LocalAuthStore.record getter re-parses localStorage
// on every single access and returns a fresh object each time — even when
// nothing changed. useSyncExternalStore requires getSnapshot to return a
// stable reference between real changes, or React spins into "Maximum
// update depth exceeded". So we cache the record ourselves and only refresh
// it from the SDK's own onChange event (which does hand us the up-to-date
// value directly, no extra `.record` read needed).
let cachedRecord: RecordModel | null = pb.authStore.record;

function subscribe(callback: () => void) {
  return pb.authStore.onChange((_token, record) => {
    cachedRecord = record;
    callback();
  });
}

function getSnapshot(): RecordModel | null {
  return cachedRecord;
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot);
  return { user, isAuthenticated: !!user && pb.authStore.isValid };
}
