import { defineConfig } from "orval";

/**
 * Generates a type-safe REST client for the d-party backend from its
 * OpenAPI schema (produced by drf-spectacular: `manage.py spectacular`).
 *
 * Regenerate with: `pnpm api:generate`
 *
 * Note: the WebSocket sync protocol is not expressed in OpenAPI; it is modelled
 * by hand in `src/domain/protocol.ts` to stay in lock-step with the backend's
 * `streamer/format.py`.
 */
export default defineConfig({
  dParty: {
    input: {
      target: "./openapi/openapi.json",
    },
    output: {
      mode: "single",
      target: "src/infrastructure/api/generated/d-party.ts",
      schemas: "src/infrastructure/api/generated/model",
      client: "fetch",
      override: {
        mutator: {
          path: "src/infrastructure/api/fetcher.ts",
          name: "customFetch",
        },
      },
    },
  },
});
