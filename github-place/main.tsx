/** @jsxImportSource npm:hono@3/jsx */

import { Hono } from "https://esm.sh/hono@4.6.12"
import { kv } from "https://esm.town/v/ericc/kv/main.ts"
import { paint } from "./routes/paint.ts"
import { selectColor } from "./routes/select-color.ts"

const app = new Hono().onError((err) => {
  throw err
})

// Color palette - only these colors are allowed
export const PALETTE = [
  "#2b283b", // Dark Slate
  "#8a5a44", // Saddle Brown
  "#c74b50", // Brick Red
  "#f9d56e", // Mellow Yellow
  "#5b8c5a", // Forest Green
  "#4a69bd", // Classic Blue
  "#7d5ba6", // Muted Purple
  "#faf3e0", // Cream White
]

export const BOARD_SIZE = 4
const PIXEL_SIZE = 40

const DEFAULT_BASE_URL = "https://github-place.val.run"
export const REPO_URLS = ["ericc-ch/ericc-ch"]

// Initialize default state
async function initializeState(): Promise<void> {
  const existingColor = await kv.get<string>("state:selected-color")

  if (!existingColor) {
    // Initialize selected color
    await kv.set("state:selected-color", PALETTE[0])

    // Initialize all pixels to default color
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        await kv.set(`pixel:${x}:${y}`, PALETTE[0])
      }
    }
  }
}

// Validation helpers
function isValidColor(color: string): boolean {
  return PALETTE.includes(color.toLowerCase())
}

function isValidCoordinate(coord: string): boolean {
  const num = parseInt(coord, 10)
  return !isNaN(num) && num >= 0 && num < BOARD_SIZE
}

await initializeState()

app.route("/select-color", selectColor)
app.route("/paint", paint)

// GET /pixel?x=<x>&y=<y> - Return SVG of single pixel
app.get("/pixel", async (c) => {
  const x = c.req.query("x") ?? ""
  const y = c.req.query("y") ?? ""

  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return c.text(
      `Invalid coordinates ${x}, ${y}. x and y must be between 0 and ${
        BOARD_SIZE - 1
      }`,
      400,
    )
  }

  const xPos = parseInt(x, 10)
  const yPos = parseInt(y, 10)

  const color = (await kv.get<string>(`pixel:${xPos}:${yPos}`)) ?? PALETTE[0]

  const svg = (
    <svg
      width={PIXEL_SIZE}
      height={PIXEL_SIZE}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill={color} />
    </svg>
  )

  return new Response(svg.toString(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no cache",
    },
  })
})

// GET /selected - Return SVG of currently selected color
app.get("/selected", async () => {
  const selectedColor = (await kv.get<string>("state:selected-color")) ??
    PALETTE[0]

  const svg = (
    <svg
      width={PIXEL_SIZE}
      height={PIXEL_SIZE}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill={selectedColor} />
    </svg>
  )

  return new Response(svg.toString(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no cache",
    },
  })
})

// GET /static?color=<hex> - Return SVG with specified color
app.get("/static", (c) => {
  let color = c.req.query("color") ?? ""
  color = `#${color}`

  if (!isValidColor(color)) {
    return c.text(
      `Invalid color: ${color}. Must be one of: ${PALETTE.join(", ")}`,
      400,
    )
  }

  const svg = (
    <svg
      width={PIXEL_SIZE}
      height={PIXEL_SIZE}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={PIXEL_SIZE} height={PIXEL_SIZE} fill={color} />
    </svg>
  )

  return new Response(svg.toString(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "max-age=86400",
    },
  })
})

app.get("/raw", (c) => {
  const baseUrl = c.req.query("baseUrl") ?? DEFAULT_BASE_URL
  const imageSize = parseInt(c.req.query("imageSize") ?? "40", 10)
  const redirect = c.req.query("redirect")

  const palette = (
    <>
      {PALETTE.map((color) => {
        const selectColorUrl = new URL(`${baseUrl}/select-color`)

        selectColorUrl.searchParams.set("color", color.slice(1))
        if (redirect) {
          selectColorUrl.searchParams.set("redirect", redirect)
        }

        return (
          <a href={selectColorUrl.toString()}>
            <img src={`${baseUrl}/static?color=${color.slice(1)}`} width="40" />
          </a>
        )
      })}
    </>
  )

  const selected = <img src={`${baseUrl}/selected`} width="40" />

  const board = (
    <>
      {Array(BOARD_SIZE)
        .fill(0)
        .map((_, y) => (
          <>
            {Array(BOARD_SIZE)
              .fill(0)
              .map((_, x) => {
                const pixelUrl = `${baseUrl}/pixel?x=${x}&y=${y}`
                const paintUrl = new URL(`${baseUrl}/paint`)

                paintUrl.searchParams.set("x", x.toString())
                paintUrl.searchParams.set("y", y.toString())
                if (redirect) {
                  paintUrl.searchParams.set("redirect", redirect)
                }

                return (
                  <a key={x} href={paintUrl.toString()}>
                    <img src={pixelUrl} width={imageSize} />
                  </a>
                )
              })}
            <br />
          </>
        ))}
    </>
  )

  const content = `
PALETTE:

${palette}

---

SELECTED:

${selected}

---

BOARD:

${board}`

  return c.text(content, 200, {
    "Cache-Control": "max-age=86400",
  })
})

app.get("/", (c) => {
  const content = (
    <html>
      <head>
        <title>GitHub Place</title>
      </head>
      <body>
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            alignItems: "center",
          }}
        >
          <div>
            <p style={{ textAlign: "center" }}>Palette</p>
            {PALETTE.map((color) => {
              return (
                <a href={`/select-color?color=${color.slice(1)}`}>
                  <span
                    style={{
                      backgroundColor: color,
                      display: "inline-block",
                      width: "40px",
                      height: "40px",
                    }}
                  >
                  </span>
                </a>
              )
            })}
          </div>

          <div>
            <p style={{ textAlign: "center" }}>Selected</p>
            <img src="/selected" width={PIXEL_SIZE} />
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {Array(BOARD_SIZE)
              .fill(0)
              .map((_, y) => {
                return (
                  <div style={{ display: "flex" }}>
                    {Array(BOARD_SIZE)
                      .fill(0)
                      .map((_, x) => {
                        const urlParams = new URLSearchParams()
                        urlParams.set("x", x.toString())
                        urlParams.set("y", y.toString())

                        return (
                          <a href={`/paint?${urlParams.toString()}`}>
                            <img
                              src={`/pixel?${urlParams.toString()}`}
                              width={PIXEL_SIZE}
                            />
                          </a>
                        )
                      })}
                  </div>
                )
              })}
          </div>
        </main>
      </body>
    </html>
  )

  return c.html(content)
})

export default app.fetch
