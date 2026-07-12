/**
 * Business-agnostic data schema.
 *
 * The receptionist agent is driven entirely by this object — to adapt the
 * system from a library to a clinic, salon, or gym, you only change the data
 * (and nothing in the webhook code). "resources" models anything with limited
 * capacity: reading-room seats, salon chairs, badminton courts, exam slots.
 */

export interface Resource {
  id: string;
  label: string; // spoken name, e.g. "reading room seats"
  capacity: number;
  available: number;
  notes?: string; // e.g. "bookable at the front desk only"
}

export interface Faq {
  q: string;
  a: string;
}

export interface BusinessData {
  name: string;
  tagline: string; // one line: what this business is
  timezone: string; // IANA zone, used to tell the agent "today"
  phoneHumanFallback?: string; // where to send callers the AI can't help
  greeting: string; // the assistant's opening line on every call
  hours: Record<string, string>; // { monday: "9:00 AM to 8:00 PM", ... }
  fees: Record<string, string>; // { "Annual membership": "500 rupees", ... }
  faqs: Faq[];
  resources: Resource[];
  announcements: string[]; // temporary notices, e.g. holiday closures
}

/** Seed data — the library example. Replace via the /admin dashboard. */
export const DEFAULT_BUSINESS: BusinessData = {
  name: "City Central Library",
  tagline: "a public lending library with reading rooms and study spaces",
  timezone: "Asia/Kolkata",
  phoneHumanFallback: undefined,
  greeting:
    "Hello! Thank you for calling City Central Library. How can I help you today?",
  hours: {
    monday: "9 AM to 8 PM",
    tuesday: "9 AM to 8 PM",
    wednesday: "9 AM to 8 PM",
    thursday: "9 AM to 8 PM",
    friday: "9 AM to 8 PM",
    saturday: "10 AM to 6 PM",
    sunday: "Closed",
  },
  fees: {
    "Annual membership (adult)": "500 rupees per year",
    "Annual membership (student)": "250 rupees per year, with a valid student ID",
    "Reading room day pass": "50 rupees per day",
    "Late return fine": "5 rupees per book per day",
  },
  faqs: [
    {
      q: "How many books can I borrow at once?",
      a: "Members can borrow up to 4 books at a time, for 14 days each.",
    },
    {
      q: "Do you have Wi-Fi?",
      a: "Yes, free Wi-Fi is available for members throughout the building.",
    },
  ],
  resources: [
    {
      id: "reading-room",
      label: "reading room seats",
      capacity: 60,
      available: 60,
      notes: "First come, first served. No advance booking.",
    },
    {
      id: "study-cabin",
      label: "private study cabins",
      capacity: 12,
      available: 12,
      notes: "Bookable at the front desk, 2 hour slots.",
    },
  ],
  announcements: [],
};
