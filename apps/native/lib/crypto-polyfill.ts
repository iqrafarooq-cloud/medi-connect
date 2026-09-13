export type CryptoPolyfillImpl = {
  getRandomValues: (values: ArrayBufferView) => ArrayBufferView;
  randomUUID: () => string;
};

export type CryptoHost = {
  crypto?: {
    getRandomValues?: (values: ArrayBufferView) => ArrayBufferView;
    randomUUID?: () => string;
  };
};

export function installCryptoPolyfill(host: CryptoHost, impl: CryptoPolyfillImpl) {
  const crypto = host.crypto ?? {};
  if (typeof crypto.getRandomValues !== "function") {
    crypto.getRandomValues = impl.getRandomValues;
  }
  if (typeof crypto.randomUUID !== "function") {
    crypto.randomUUID = impl.randomUUID;
  }

  try {
    host.crypto = crypto;
  } catch {
    Object.defineProperty(host, "crypto", {
      configurable: true,
      enumerable: true,
      writable: true,
      value: crypto,
    });
  }
}
