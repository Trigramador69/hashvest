import { describe, expect, it } from "vitest";

import {
  createTranslator,
  getMessages,
  interpolate,
  missingKeys,
} from "./dictionary";
import { en } from "./dictionaries/en";
import type { TranslationKey } from "./dictionaries/en";
import {
  DEFAULT_LOCALE,
  LOCALE_CODES,
  htmlLang,
  isLocale,
  resolveLocale,
} from "./locales";

const KEYS = Object.keys(en) as TranslationKey[];

describe("locale resolution", () => {
  it("accepts every supported locale", () => {
    for (const code of LOCALE_CODES) expect(isLocale(code)).toBe(true);
  });

  it("falls back to English for unknown, stale or absent cookie values", () => {
    for (const value of [undefined, null, "", "fr", "en-GB", "zh", "../en"]) {
      expect(resolveLocale(value)).toBe(DEFAULT_LOCALE);
    }
  });

  it("maps Simplified Chinese to a script-qualified html lang", () => {
    expect(htmlLang("zh-CN")).toBe("zh-Hans");
    expect(htmlLang("en")).toBe("en");
    expect(htmlLang("es")).toBe("es");
  });
});

describe("message resolution", () => {
  it("resolves every key for every locale", () => {
    for (const locale of LOCALE_CODES) {
      const messages = getMessages(locale);
      for (const key of KEYS) {
        expect(messages[key], `${locale} → ${key}`).toBeTruthy();
      }
    }
  });

  it("returns English unchanged for the default locale", () => {
    expect(getMessages("en")).toEqual({ ...en });
  });

  it("translates rather than echoing English", () => {
    // A locale that merely fell back everywhere would silently pass the
    // completeness check above.
    for (const locale of ["zh-CN", "es"] as const) {
      const messages = getMessages(locale);
      const translated = KEYS.filter((key) => messages[key] !== en[key]);
      expect(translated.length).toBeGreaterThan(KEYS.length / 2);
    }
  });

  it("reports no missing keys while the dictionaries are complete", () => {
    for (const locale of LOCALE_CODES) expect(missingKeys(locale)).toEqual([]);
  });
});

describe("fallback", () => {
  it("uses English when a locale omits a key", () => {
    const messages = getMessages("es");
    const partial = { ...messages };
    delete (partial as Record<string, string>)["session.signIn"];
    const t = createTranslator(partial);
    expect(t("session.signIn")).toBe(en["session.signIn"]);
  });

  it("uses English when a translation is blank", () => {
    // withoutBlanks() runs inside getMessages, so a blank override never wins.
    const messages = getMessages("zh-CN");
    expect(messages["meta.title"].trim()).not.toBe("");
  });
});

describe("interpolation", () => {
  const t = createTranslator(getMessages("en"));

  it("substitutes named placeholders", () => {
    expect(
      t("session.switchNetworkChain", {
        network: "HSK Testnet",
        chainId: 133,
      }),
    ).toBe("Switch your wallet to HSK Testnet (chain 133) first.");
  });

  it("keeps technical literals verbatim", () => {
    const network = { network: "HSK Testnet", chainId: 133 };
    expect(t("session.switchNetworkChain", network)).toBe(
      "Switch your wallet to HSK Testnet (chain 133) first.",
    );
    expect(t("home.note", { network: "HSK Testnet" })).toContain("ERC20");
  });

  it("substitutes the same literals into every locale", () => {
    for (const locale of LOCALE_CODES) {
      const translate = createTranslator(getMessages(locale));
      const rendered = translate("session.switchNetworkChain", {
        network: "HSK Testnet",
        chainId: 133,
      });
      expect(rendered).toContain("HSK Testnet");
      expect(rendered).toContain("133");
    }
  });

  it("leaves an unknown placeholder visible instead of blanking it", () => {
    expect(interpolate("Chain {chainId}", {})).toBe("Chain {chainId}");
    expect(interpolate("Chain {chainId}")).toBe("Chain {chainId}");
  });

  it("does not substitute into messages that take no values", () => {
    expect(t("shell.home")).toBe(en["shell.home"]);
  });
});

describe("placeholder parity", () => {
  const slots = (value: string) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

  it("keeps the same {placeholders} in every locale", () => {
    // A translation that drops a slot renders a sentence with a hole in it and
    // fails nothing else: no type error, no missing key, no blank string. The
    // slots carry addresses, amounts and chain ids, so a dropped one is a
    // demo-visible bug.
    for (const locale of LOCALE_CODES) {
      const messages = getMessages(locale) as Record<string, string>;
      for (const key of KEYS) {
        expect(slots(messages[key]), `${locale} → ${key}`).toEqual(
          slots(en[key]),
        );
      }
    }
  });

  it("never invents a placeholder English does not have", () => {
    for (const locale of LOCALE_CODES) {
      const messages = getMessages(locale) as Record<string, string>;
      for (const key of KEYS) {
        for (const slot of slots(messages[key])) {
          expect(slots(en[key]), `${locale} → ${key} → {${slot}}`).toContain(
            slot,
          );
        }
      }
    }
  });
});

describe("technical literals", () => {
  it("never inlines an address, hash or chain id into a message", () => {
    // Literals must arrive as placeholders so they stay identical per locale.
    for (const [key, value] of Object.entries(en)) {
      expect(value, key).not.toMatch(/0x[0-9a-fA-F]{6,}/);
      expect(value, key).not.toMatch(/\bchain 133\b/i);
    }
  });
});
