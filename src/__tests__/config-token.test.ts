import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { PictoriumUserConfig } from "@/lib/config-token"

const SAMPLE_CONFIG: PictoriumUserConfig = {
  globalBadges: true,
  rankingBadges: false,
  badgeStyle: "shadow",
  rankingBadgeStyle: "default",
  blurEnabled: true,
  blurIntensity: 5,
  blurFade: 60,
  blurDarkness: 40,
  gradientHeight: 30,
  networkLogo: true,
  autoRotateClean: false,
  logoFitEnabled: true,
  customBadge: "Test",
}

const MINIMAL_CONFIG: PictoriumUserConfig = {
  globalBadges: false,
  rankingBadges: false,
  badgeStyle: "pill",
  rankingBadgeStyle: "bar",
  blurEnabled: false,
  blurIntensity: 3,
  blurFade: 50,
  blurDarkness: 30,
  gradientHeight: 20,
  networkLogo: false,
  autoRotateClean: true,
  logoFitEnabled: false,
}

// HMAC_SECRET is read at module-load (`const HMAC_SECRET = process.env...`),
// so each import must happen AFTER setting the env vars. NODE_ENV is read at
// call time, so it can be changed at runtime. `importConfigToken()` resets the
// module registry and re-imports so the module picks up the current env.
// Env is manipulated via `vi.stubEnv` because @types/node marks NODE_ENV as
// read-only; `vi.unstubAllEnvs()` restores every value in afterEach.
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined

async function importConfigToken() {
  vi.resetModules()
  return import("@/lib/config-token")
}

beforeEach(() => {
  vi.stubEnv("CONFIG_HMAC_SECRET", "")
  vi.stubEnv("ENCRYPTION_KEY_SECRET", "")
  vi.stubEnv("NODE_ENV", "test")
  // Silence the module-load warning that fires in production without a secret.
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  consoleErrorSpy?.mockRestore()
  vi.resetModules()
})

describe("encodeConfig / decodeConfig round-trip", () => {
  it("encodes and decodes without a secret (dev/test)", async () => {
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    // No secret → unsigned: just base64url-encoded JSON, no signature segment.
    expect(token).not.toContain(".")
    expect(decodeConfig(token)).toEqual(SAMPLE_CONFIG)
  })

  it("encodes and decodes with a secret (signed)", async () => {
    vi.stubEnv("CONFIG_HMAC_SECRET", "test-secret")
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    expect(token).toContain(".")
    expect(decodeConfig(token)).toEqual(SAMPLE_CONFIG)
  })

  it("round-trips MINIMAL_CONFIG", async () => {
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(MINIMAL_CONFIG)
    expect(decodeConfig(token)).toEqual(MINIMAL_CONFIG)
  })

  it("round-trips optional fields (customBadge, ribbonSide)", async () => {
    const config: PictoriumUserConfig = {
      ...SAMPLE_CONFIG,
      customBadge: "HD",
      ribbonSide: "right",
    }
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(config)
    expect(decodeConfig(token)).toEqual(config)
  })

  it("decodes tokens with u=, c=, or config= prefixes", async () => {
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    expect(decodeConfig(`u=${token}`)).toEqual(SAMPLE_CONFIG)
    expect(decodeConfig(`c=${token}`)).toEqual(SAMPLE_CONFIG)
    expect(decodeConfig(`config=${token}`)).toEqual(SAMPLE_CONFIG)
  })
})

describe("decodeConfig invalid tokens", () => {
  it("returns null for garbage input", async () => {
    const { decodeConfig } = await importConfigToken()
    expect(decodeConfig("not-a-valid-token!@#")).toBeNull()
    expect(decodeConfig("")).toBeNull()
  })

  it("returns null for base64 of invalid JSON", async () => {
    const { decodeConfig } = await importConfigToken()
    const b64 = Buffer.from("{not json", "utf-8").toString("base64url")
    expect(decodeConfig(b64)).toBeNull()
  })

  it("returns null for valid JSON that fails the Zod schema", async () => {
    const { decodeConfig } = await importConfigToken()
    const b64 = Buffer.from(JSON.stringify({ foo: "bar" }), "utf-8").toString("base64url")
    expect(decodeConfig(b64)).toBeNull()
  })

  it("returns null when the signature is tampered", async () => {
    vi.stubEnv("CONFIG_HMAC_SECRET", "test-secret")
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    const [b64, sig] = token.split(".")
    const last = sig!.endsWith("A") ? "B" : "A"
    const tampered = `${b64}.${sig!.slice(0, -1)}${last}`
    expect(decodeConfig(tampered)).toBeNull()
  })

  it("returns null for a token signed with a different secret", async () => {
    vi.stubEnv("CONFIG_HMAC_SECRET", "secret-a")
    const { encodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)

    vi.stubEnv("CONFIG_HMAC_SECRET", "secret-b")
    const { decodeConfig } = await importConfigToken()
    expect(decodeConfig(token)).toBeNull()
  })

  it("returns null for a truncated signature", async () => {
    vi.stubEnv("CONFIG_HMAC_SECRET", "test-secret")
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    const [b64] = token.split(".")
    expect(decodeConfig(`${b64}.short`)).toBeNull()
  })
})

describe("production fail-closed", () => {
  it("encodeConfig throws in production without a secret", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { encodeConfig } = await importConfigToken()
    expect(() => encodeConfig(SAMPLE_CONFIG)).toThrow(/HMAC_SECRET/)
  })

  it("encodeConfig works in production with a secret", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CONFIG_HMAC_SECRET", "prod-secret")
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    expect(token).toContain(".")
    expect(decodeConfig(token)).toEqual(SAMPLE_CONFIG)
  })

  it("decodeConfig rejects unsigned tokens in production without a secret", async () => {
    // Build the unsigned token in dev/test (encodeConfig would throw in prod).
    const { encodeConfig } = await importConfigToken()
    const unsignedToken = encodeConfig(SAMPLE_CONFIG)
    expect(unsignedToken).not.toContain(".")

    vi.stubEnv("NODE_ENV", "production")
    const { decodeConfig } = await importConfigToken()
    expect(decodeConfig(unsignedToken)).toBeNull()
  })

  it("decodeConfig accepts signed tokens in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CONFIG_HMAC_SECRET", "prod-secret")
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const token = encodeConfig(SAMPLE_CONFIG)
    expect(decodeConfig(token)).toEqual(SAMPLE_CONFIG)
  })

  it("decodeConfig rejects SIGNED-format tokens in production without a secret", async () => {
    // Regressione C2: in produzione senza secret un token in formato firmato
    // `b64.sig` NON deve essere accettato. Prima della fix la verifica della
    // firma era dentro `if (HMAC_SECRET)`, quindi il segmento firma veniva
    // ignorato e il payload decodificato comunque (fail-open).
    const b64 = Buffer.from(JSON.stringify(SAMPLE_CONFIG), "utf-8").toString("base64url")
    const signedFormat = `${b64}.totally-fake-signature`

    vi.stubEnv("NODE_ENV", "production")
    const { decodeConfig } = await importConfigToken()
    expect(decodeConfig(signedFormat)).toBeNull()
  })
})

describe("defensive clamping on decode", () => {
  it("clamps out-of-range numeric fields", async () => {
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const extreme: PictoriumUserConfig = {
      ...SAMPLE_CONFIG,
      blurIntensity: 999,
      blurFade: -10,
      blurDarkness: 200,
      gradientHeight: 9999,
    }
    const token = encodeConfig(extreme)
    const decoded = decodeConfig(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.blurIntensity).toBe(100)
    expect(decoded!.blurFade).toBe(0)
    expect(decoded!.blurDarkness).toBe(100)
    expect(decoded!.gradientHeight).toBe(100)
  })

  it("rounds non-integer numeric fields", async () => {
    const { encodeConfig, decodeConfig } = await importConfigToken()
    const config: PictoriumUserConfig = { ...SAMPLE_CONFIG, blurIntensity: 5.6 }
    const token = encodeConfig(config)
    const decoded = decodeConfig(token)
    expect(decoded).not.toBeNull()
    expect(decoded!.blurIntensity).toBe(6)
  })
})
