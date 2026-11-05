import { publicEnv } from "@/lib/env"

/** Store identity used by metadata, structured data and the footer. Copy comes from the design. */
export const siteConfig = {
  name: "Sole Drop",
  tagline: "New and pre-loved footwear",
  description: "Fresh finds. Fresh steps. New and pre-loved footwear from brands you love.",
  url: publicEnv.NEXT_PUBLIC_SITE_URL,
  locale: "en",
  dir: "ltr",
  currency: "PKR",
  contact: {
    whatsappLabel: "+9333-333333",
    whatsappHref: "https://wa.me/929333333333",
    email: "Soledropofficial@gmail.com",
    address: "237, street no 5, Karachi",
    /** Support days from the design; the opening times are the owner's to supply (null hides the line). */
    supportDays: "Mon - Sat",
    supportHours: null as string | null,
  },
  social: {
    instagramHandle: "@Soledropoffical",
    instagram: "https://www.instagram.com/soledropofficial",
    facebook: "https://www.facebook.com/soledropofficial",
    tiktok: "https://www.tiktok.com/@soledropofficial",
  },
} as const
