export function resolveNativeServerUrl(options: {
  envUrl: string;
  hostUri?: string | null;
  platform: string;
}): string {
  if (options.platform === "web") {
    return options.envUrl;
  }

  const isLoopback =
    options.envUrl.includes("localhost") || options.envUrl.includes("127.0.0.1");
  if (!isLoopback) {
    return options.envUrl;
  }

  let host = options.hostUri?.split(":")[0];
  if (!host) {
    host = options.platform === "android" ? "10.0.2.2" : "localhost";
  }
  if (options.platform === "android" && (host === "localhost" || host === "127.0.0.1")) {
    host = "10.0.2.2";
  }

  return options.envUrl.replace("localhost", host).replace("127.0.0.1", host);
}
