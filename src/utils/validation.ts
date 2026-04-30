import { App } from "@/types";

export function isApp(value: unknown): value is App {
  return Boolean(
    value &&
    typeof value === "object" &&
    "bundleId" in value &&
    "name" in value &&
    typeof (value as App).bundleId === "string" &&
    typeof (value as App).name === "string",
  );
}
