import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const session = vi.fn<() => { data: { user: { name?: string; email?: string } | null } }>(() => ({
  data: { user: null },
}));
const signOut = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => session(),
  signOut: (...args: unknown[]) => signOut(...args),
}));

const { UserMenu } = await import("../user-menu");

describe("UserMenu", () => {
  it("falls back to a demo identity when there is no session", () => {
    session.mockReturnValue({ data: { user: null } });
    render(<UserMenu />);

    expect(screen.getByText("Demo User")).toBeInTheDocument();
  });

  it("derives initials from the display name", () => {
    session.mockReturnValue({ data: { user: { name: "Sarah Chen", email: "s@acme.dev" } } });
    render(<UserMenu />);

    expect(screen.getByText("SC")).toBeInTheDocument();
    expect(screen.getByText("Sarah Chen")).toBeInTheDocument();
  });

  it("caps initials at two characters", () => {
    session.mockReturnValue({
      data: { user: { name: "Ana Maria de Souza Andrade", email: "a@b.dev" } },
    });
    render(<UserMenu />);

    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("hides the name in compact mode but keeps the avatar", () => {
    session.mockReturnValue({ data: { user: { name: "Sarah Chen", email: "s@acme.dev" } } });
    render(<UserMenu compact />);

    expect(screen.queryByText("Sarah Chen")).not.toBeInTheDocument();
    expect(screen.getByText("SC")).toBeInTheDocument();
  });

  it("opens a menu of account actions", async () => {
    render(<UserMenu />);
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("signs out with a callback URL", async () => {
    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByText("Sign out"));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("closes on an outside click", async () => {
    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Sign out")).toBeInTheDocument();

    await userEvent.click(document.body);
    expect(screen.queryByText("Sign out")).not.toBeInTheDocument();
  });
});
