import { Hono } from "https://esm.sh/hono@4.6.12"
import { purgeCamo } from "https://esm.town/v/ericc/camocide/main.ts"
import { kv } from "https://esm.town/v/ericc/kv/main.ts"
import { BOARD_SIZE, PALETTE, REPO_URLS } from "../main.tsx"
import { isValidCoordinate } from "../validation.ts"

export const paint = new Hono()

// GET /select-color?color=<hex> - Set selected color
paint.get("/", async (c) => {
  const x = c.req.query("x") ?? ""
  const y = c.req.query("y") ?? ""

  const redirect = c.req.query("redirect")

  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return c.text(
      `Invalid coordinates: ${x}, ${y}. x and y must be between 0 and ${
        BOARD_SIZE - 1
      }`,
      400,
    )
  }

  const xPos = parseInt(x, 10)
  const yPos = parseInt(y, 10)

  // Get current selected color
  const selectedColor = (await kv.get<string>("state:selected-color")) ??
    PALETTE[0]

  await kv.set(`pixel:${xPos}:${yPos}`, selectedColor)
  await purgeCamo(REPO_URLS)

  return c.redirect(redirect ?? "/")
})
