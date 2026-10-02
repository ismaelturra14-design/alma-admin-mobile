import { ENV } from "@/config/env";

export function resolveAssetUri(value: string): string {
  const trimmed = value.trim().replace(/&amp;/gi, "&").replace(/\\/g, "/");
  if (!trimmed) {
    return "";
  }

  if (
    /^https?:\/\//i.test(trimmed) ||
    /^(content:|data:|blob:)/i.test(trimmed)
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  let path = trimmed;
  if (/^file:/i.test(path)) {
    try {
      path = new URL(path).pathname;
    } catch {
      path = path.replace(/^file:\/*/i, "/");
    }
  }

  const publicFilePath = path.match(/(?:^|\/)(sites\/.*)$/i)?.[1];
  if (publicFilePath) {
    path = publicFilePath;
  } else if (/^file:|^\/(?:private|var|data)\//i.test(trimmed)) {
    return "";
  }

  if (/^[\w.-]+\.[a-z]{2,}(?::\d+)?(?:\/|$)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  const baseUrl = ENV.PUBLIC_FILE_BASE_URL.replace(/\/+$/, "");
  path = path.replace(/^\/+/, "");
  const basePath = baseUrl
    .match(/^https?:\/\/[^/]+(\/.*)$/i)?.[1]
    ?.replace(/\/+$/, "");
  if (
    basePath &&
    (path === basePath.replace(/^\/+/, "") ||
      path.startsWith(`${basePath.replace(/^\/+/, "")}/`))
  ) {
    path = path.slice(basePath.replace(/^\/+/, "").length).replace(/^\/+/, "");
  }
  return baseUrl && path ? `${baseUrl}/${path}` : "";
}