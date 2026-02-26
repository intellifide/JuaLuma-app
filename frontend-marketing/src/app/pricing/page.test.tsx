import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import Pricing from "./page"

const originalFetch = global.fetch

describe("Pricing page fallback rendering", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
  })

  it("renders fallback pricing cards when billing plans API returns an empty array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    render(<Pricing />)

    expect(screen.getByText("Loading pricing plans...")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Get Started" })).toBeInTheDocument()
      expect(screen.getAllByRole("link", { name: "Start Free Trial" }).length).toBeGreaterThan(0)
    })
  })
})
