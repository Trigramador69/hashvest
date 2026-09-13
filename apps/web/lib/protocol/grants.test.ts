import { describe, expect, it } from "vitest";

import { errorMessage } from "./grants";

describe("errorMessage", () => {
  it("uses the caller's localized fallback for unknown errors", () => {
    expect(
      errorMessage(new Error("opaque backend detail"), {
        fallback: "La solicitud falló. Inténtalo de nuevo.",
      }),
    ).toBe("La solicitud falló. Inténtalo de nuevo.");
  });

  it("localizes the known wallet RPC diagnostic", () => {
    expect(
      errorMessage(new Error("eth_getBlockByNumber failed"), {
        rpcUnavailable: "El RPC de HSK Testnet no está disponible.",
      }),
    ).toBe("El RPC de HSK Testnet no está disponible.");
  });

  it("preserves translated errors thrown by the caller", () => {
    expect(
      errorMessage(new Error("Cambia primero a HSK Testnet."), {
        fallback: "La solicitud falló. Inténtalo de nuevo.",
        preserve: ["Cambia primero a HSK Testnet."],
      }),
    ).toBe("Cambia primero a HSK Testnet.");
  });
});
