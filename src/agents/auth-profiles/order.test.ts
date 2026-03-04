import { describe, expect, it } from "vitest";
import { resolveAuthProfileOrder } from "./order.js";
import type { AuthProfileStore } from "./types.js";

describe("resolveAuthProfileOrder", () => {
  it("accepts base-provider credentials for volcengine-plan auth lookup", () => {
    const store: AuthProfileStore = {
      version: 1,
      profiles: {
        "volcengine:default": {
          type: "api_key",
          provider: "volcengine",
          key: "sk-test",
        },
      },
    };

    const order = resolveAuthProfileOrder({
      store,
      provider: "volcengine-plan",
    });

    expect(order).toEqual(["volcengine:default"]);
  });

  it("resolves api_key profiles using both apiKey and key fields (#34654)", () => {
    const store: AuthProfileStore = {
      version: 1,
      profiles: {
        "google:default": {
          type: "api_key",
          provider: "google",
          apiKey: "AIzaSy...",
        } as AuthProfileStore["profiles"][string],
        "anthropic:default": {
          type: "api_key",
          provider: "anthropic",
          key: "sk-ant-...",
        },
      },
    };

    const order = resolveAuthProfileOrder({
      store,
      provider: "google",
    });

    expect(order).toEqual(["google:default"]);

    const anthropicOrder = resolveAuthProfileOrder({
      store,
      provider: "anthropic",
    });

    expect(anthropicOrder).toEqual(["anthropic:default"]);
  });
});
