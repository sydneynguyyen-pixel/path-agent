import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { JourneyProvider, useJourney } from "@/lib/journey";
import { BottomTabs } from "@/components/app/Shell";

vi.mock("@tanstack/react-router", async (orig) => ({ ...(await orig<object>()), Link: ({ children, className, ...rest }: { children: ReactNode; className?: string; "aria-current"?: "page" }) => <a href="/" className={className} aria-current={rest["aria-current"]}>{children}</a> }));
const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

const wrapper = ({ children }: { children: ReactNode }) => <JourneyProvider>{children}</JourneyProvider>;

/** The tab bar plus a peek at journey state, so a test can check what was logged. */
let journey: ReturnType<typeof useJourney>;
function Probe() {
  journey = useJourney();
  return null;
}
const view = () => render(<JourneyProvider><BottomTabs path="/" /><Probe /></JourneyProvider>);

beforeEach(() => toast.mockClear());

describe("people she meets (journey state)", () => {
  it("meet, note, forget, and Reset demo clears them", () => {
    const { result } = renderHook(() => useJourney(), { wrapper });
    act(() => result.current.meet("lena", "ux-night"));
    act(() => result.current.meet("lena", "ux-night", "Bus stops"));
    expect(result.current.metAt).toHaveLength(1);
    expect(result.current.metAt[0]).toMatchObject({ peerId: "lena", eventId: "ux-night", note: "Bus stops" });
    act(() => result.current.setMeetNote("lena", "ux-night", "Bus stops and maps"));
    expect(result.current.metAt[0]!.note).toBe("Bus stops and maps");
    act(() => result.current.meet("jordan", "ux-night"));
    act(() => result.current.forgetMeet("lena", "ux-night"));
    expect(result.current.metAt.map((m) => m.peerId)).toEqual(["jordan"]);
    act(() => result.current.reset());
    expect(result.current.metAt).toEqual([]);
  });
});

describe("phone tab bar", () => {
  it("has five slots with the Card button in the center", () => {
    view();
    const nav = screen.getByRole("navigation", { name: "Main" });
    const slots = nav.querySelector(".glass-bar")!.children;
    expect(slots).toHaveLength(5);
    expect([...slots].map((s) => s.textContent?.replace(/\d+/g, "").trim())).toEqual(["Home", "Events", "Card", "Sprout", "More"]);
    expect(slots[2]).toBe(within(nav).getByRole("button", { name: "Show my card" }));
  });
});

describe("share sheet", () => {
  it("shows a real QR code and which event she's at, and gives focus back to the Card button on close", async () => {
    view();
    const card = screen.getByRole("button", { name: "Show my card" });
    fireEvent.click(card);
    const sheet = screen.getByRole("dialog", { name: "Show my card" });
    const qr = within(sheet).getByRole("img", { name: "QR code that opens your card" });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr.getAttribute("data-qr")).toBe("https://trellis.example/c/maya-t");
    expect(qr.querySelector("path")!.getAttribute("d")!.length).toBeGreaterThan(100);
    // The scripted clock is three days before UX Night, so she isn't at one yet.
    expect(within(sheet).getByRole("button", { name: /Not at an event/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: /Scan a card/ })).toBeDisabled();

    act(() => journey.toggleSavedOpportunity("ux-night"));
    fireEvent.click(within(sheet).getByRole("button", { name: /Not at an event/ }));
    fireEvent.click(within(sheet).getByRole("button", { name: /UX Night/ }));
    expect(within(sheet).getByRole("button", { name: /At UX Night · Tue 5:30 PM/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("combobox", { name: "Who sees it" })).toHaveValue("school");

    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(card).toHaveFocus();
  });

  it("scan → pick who she met → note → follow-up draft → Send in Trellis logs a decision and says demo only", () => {
    view();
    act(() => journey.toggleSavedOpportunity("ux-night"));
    fireEvent.click(screen.getByRole("button", { name: "Show my card" }));
    let sheet = screen.getByRole("dialog");
    fireEvent.click(within(sheet).getByRole("button", { name: /Not at an event/ }));
    fireEvent.click(within(sheet).getByRole("button", { name: /UX Night/ }));
    fireEvent.click(within(sheet).getByRole("button", { name: /Scan a card/ }));

    sheet = screen.getByRole("dialog", { name: "Scan a card" });
    expect(within(sheet).getByText(/Demo: the camera stays off/)).toBeInTheDocument();
    const nearby = within(sheet).getByRole("region", { name: "Nearby at UX Night" });
    fireEvent.click(within(nearby).getByRole("button", { name: /Lena K\./ }));

    sheet = screen.getByRole("dialog", { name: "You met Lena" });
    expect(journey.metAt).toMatchObject([{ peerId: "lena", eventId: "ux-night" }]);
    expect(within(sheet).getByRole("button", { name: /Send friend request/ })).toBeInTheDocument();
    fireEvent.change(within(sheet).getByLabelText(/What we talked about/), { target: { value: "Her bus-stop sketches" } });
    fireEvent.click(within(sheet).getByRole("button", { name: "Write a follow-up" }));

    sheet = screen.getByRole("dialog", { name: "Follow up" });
    const draft = within(sheet).getByRole("textbox", { name: "Follow-up to Lena" }) as HTMLTextAreaElement;
    expect(draft.value).toContain("Hi Lena,");
    expect(draft.value).toContain("It was good to meet you at UX Night.");
    expect(draft.value).toContain("I enjoyed talking about your bus-stop sketches.");
    // Lena and Maya haven't both said yes, so her school email isn't shared: no Email button.
    expect(within(sheet).queryByRole("link", { name: /Email/ })).not.toBeInTheDocument();

    fireEvent.change(draft, { target: { value: `${draft.value}\nP.S. edited by me` } });
    const before = journey.decisions.length;
    fireEvent.click(within(sheet).getByRole("button", { name: /Send in Trellis/ }));
    expect(toast).toHaveBeenCalledWith("Demo only: no message went out.", expect.anything());
    expect(journey.decisions).toHaveLength(before + 1);
    expect(journey.decisions.at(-1)).toMatchObject({ what: "Sent a follow-up to Lena from UX Night in Trellis", next: "You sent it yourself. Demo only: no message went out." });
    expect(journey.metAt[0]!.followedUp).toBeInstanceOf(Date);

    sheet = screen.getByRole("dialog", { name: "Show my card" });
    const list = within(sheet).getByRole("region", { name: "Follow up" });
    expect(within(list).getByText("Followed up")).toBeInTheDocument();
  });
});
