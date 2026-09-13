import * as Crypto from "expo-crypto";

import { installCryptoPolyfill } from "@/lib/crypto-polyfill";

installCryptoPolyfill(globalThis, {
  getRandomValues: Crypto.getRandomValues as (values: ArrayBufferView) => ArrayBufferView,
  randomUUID: Crypto.randomUUID,
});
