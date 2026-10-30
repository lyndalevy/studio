import type { CalEvent } from "@/lib/dashboard/calendar";

/** The pill each kind of calendar event gets, on the Calendar tab and in each client's Upcoming list. */
export const KINDS: Record<CalEvent["kind"], { name: string; style: string }> = {
  shoot: { name: "Shoot", style: "bg-[#1c1714] text-cream" },
  make: { name: "Make posts", style: "border border-red bg-cream" },
  schedule: { name: "Schedule", style: "bg-red text-cream" },
  invoice: { name: "Send invoice", style: "border-2 border-red bg-cream-deep" },
  due: { name: "Payment due", style: "border-2 border-dashed border-red" },
  pickup: { name: "Pick up check", style: "border-2 border-[#1c1714] bg-cream" },
  note: { name: "Note", style: "bg-cream-deep" },
  pay: { name: "Pay yourself", style: "bg-[#c39b2a] text-[#1c1714]" },
};
