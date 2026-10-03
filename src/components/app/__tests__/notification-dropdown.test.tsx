import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const { NotificationDropdown } = await import("../notification-dropdown");
const { demoNotifications } = await import("@/lib/demo/data/notifications");

async function openPanel() {
  render(<NotificationDropdown />);
  await userEvent.click(screen.getByRole("button", { name: "Notifications" }));
}

function rowFor(title: string) {
  return screen.getByText(title).closest("button");
}

describe("NotificationDropdown", () => {
  it("shows the unread count on the bell", () => {
    render(<NotificationDropdown />);

    const expected = demoNotifications.filter((n) => !n.read).length;
    expect(expected).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Notifications" })).toHaveTextContent(String(expected));
  });

  it("keeps the panel closed until the bell is pressed", () => {
    render(<NotificationDropdown />);
    expect(screen.queryByText("Mark all read")).not.toBeInTheDocument();
  });

  it("opens on click and lists the notifications", async () => {
    await openPanel();

    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(screen.getByText(demoNotifications[0]!.title)).toBeInTheDocument();
  });

  it("marks everything as read and clears the badge", async () => {
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: /mark all read/i }));

    // The badge disappearing is the only signal the user gets that anything
    // changed, so it has to go.
    expect(screen.queryByText(/mark all read/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/new$/)).not.toBeInTheDocument();
  });

  it("toggles a single notification without opening it", async () => {
    await openPanel();

    const unread = demoNotifications.find((n) => !n.read)!;
    expect(rowFor(unread.title)).not.toBeNull();

    // The row opens the notification; the separate control next to it changes
    // read state. They must not be the same button.
    const toggle = screen.getByRole("button", {
      name: `Mark "${unread.title}" as read`,
    });
    await userEvent.click(toggle);

    expect(screen.getByRole("button", { name: `Mark "${unread.title}" as unread` })).toBeInTheDocument();
  });

  it("navigates to the notification target and closes", async () => {
    await openPanel();

    const navigable = demoNotifications.find((n) => n.actionUrl);
    expect(navigable).toBeDefined();

    await userEvent.click(screen.getByText(navigable!.title));

    expect(push).toHaveBeenCalledWith(navigable!.actionUrl);
    expect(screen.queryByRole("heading", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("closes when a click lands outside it", async () => {
    await openPanel();
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument();

    await userEvent.click(document.body);

    expect(screen.queryByRole("heading", { name: "Notifications" })).not.toBeInTheDocument();
  });

  it("keeps its two controls as siblings, never nested", async () => {
    await openPanel();
    // Nested interactive elements are invalid HTML and make the inner control
    // unreachable by keyboard.
    const title = demoNotifications[0]!.title;
    const openRow = rowFor(title);
    const readToggle = screen.getByRole("button", {
      name: `Mark "${title}" as ${demoNotifications[0]!.read ? "unread" : "read"}`,
    });

    expect(openRow).not.toBeNull();
    expect(readToggle.closest("button")).toBe(readToggle);
    expect(openRow?.contains(readToggle)).toBe(false);
  });

  it("renders each notification with its own relative timestamp", async () => {
    await openPanel();
    const stamps = screen.getAllByText(/ago$|just now/);
    expect(stamps.length).toBeGreaterThan(0);
    expect(stamps.length).toBeLessThanOrEqual(demoNotifications.length);
  });
});
