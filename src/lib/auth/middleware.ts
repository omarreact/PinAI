import { createMiddleware } from "@tanstack/react-start";

/** Same-origin, signed-session identity on every per-user server function. */
export const authMiddleware = createMiddleware({ type: "function" })
  .server(async ({ next }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { requireUserId } = await import("./verify.server");
    assertSameSiteRequest();
    const userId = await requireUserId();
    return next({ context: { userId } });
  });
