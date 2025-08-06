import { Hono } from "https://esm.sh/hono@4.6.12"
import { purgeCamo } from "https://esm.town/v/ericc/camocide/main.ts"
import { kv } from "https://esm.town/v/ericc/kv/main.ts"
import { PALETTE, REPO_URLS } from "../main.tsx"
import { isValidColor } from "../validation.ts"

export const selectColor = new Hono()

// GET /select-color?color=<hex> - Set selected color
selectColor.get("/", async (c) => {
  let color = c.req.query("color") ?? ""
  color = `#${color}`

  const redirect = c.req.query("redirect")

  if (!isValidColor(color)) {
    return c.text(
      `Invalid color: ${color}. Must be one of: ${PALETTE.join(", ")}`,
      400,
    )
  }

  await kv.set("state:selected-color", color)
  await purgeCamo(REPO_URLS)

  return c.redirect(redirect ?? "/")
})
