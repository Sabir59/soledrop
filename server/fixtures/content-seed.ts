import type { Faq, Page } from "@/server/content/types"

/**
 * Policy pages and FAQs. The design leaves the FAQ body empty and has no policy pages, so this
 * copy is derived from the store facts the design does state (free delivery over PKR 5,000,
 * Rs. 250 delivery, 7-day returns, cash on delivery, condition grading) — D-011 in
 * docs/app/design-decisions.md. Legal pages are marked for the owner's review (Needs from you).
 */

const updatedAt = "2026-11-03T00:00:00.000Z"

const faqList: [string, string, string][] = [
  ["Orders & payment", "How do I place an order?", "Pick your size, add the pair to your bag and check out. You don't need an account — we'll email your order confirmation and you can track it from the link inside."],
  ["Orders & payment", "Which payment methods do you accept?", "Cash on delivery anywhere in Pakistan, and bank transfer. For bank transfer we show our account details after you place the order; we ship once the payment lands."],
  ["Orders & payment", "Can I change or cancel my order?", "Yes, until it ships. Message us on WhatsApp or through the contact form with your order number and we'll update or cancel it."],
  ["Delivery", "How much is delivery?", "Standard delivery is Rs. 250 and free on orders above PKR 5,000."],
  ["Delivery", "How long will my order take?", "2–5 working days for standard delivery across Pakistan, 1–2 days for express delivery in Karachi, Lahore and Islamabad."],
  ["Delivery", "How do I track my order?", "Once your order ships we email a tracking number. You can also see the status any time from Account → Orders or the link in your confirmation email."],
  ["Returns & exchanges", "What is your return policy?", "Brand-new pairs can be returned within 7 days of delivery if they're unworn and in the original box. Start a return from your order page or contact us."],
  ["Returns & exchanges", "Can I exchange for a different size?", "Yes. Request a return for the pair and place a new order for the size you need — we'll refund the first pair as soon as it reaches us."],
  ["Returns & exchanges", "Can I return a pre-loved pair?", "Pre-loved pairs can be returned within 7 days if they don't match the condition we described. Each listing shows the exact pair you'll receive."],
  ["Pre-loved", "What does the condition grade mean?", "Like New: looks almost brand new, very clean from top to bottom. Excellent: worn a little, but still very clean and in great shape. Great: used, but well looked after. Good: shows more use, but still looks good and feels fine to wear. Minor Marks: may have small marks or flaws, always shown in the photos. Every pair is inspected, cleaned and sanitised."],
  ["Pre-loved", "Are pre-loved pairs authentic?", "Yes. Every pair is checked by our team before it's listed. If a pair ever turns out not to be authentic, you get a full refund."],
  ["Sizing", "How do I find my size?", "Use our size guide to convert between EU, UK, US and CM. If you're between two sizes, choose the larger one for a roomier fit."],
]

export const contentSeed: { pages: Page[]; faqs: Faq[] } = {
  faqs: faqList.map(([category, question, answer], position) => ({
    id: `80000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}`,
    category,
    question,
    answer,
    position,
  })),
  pages: [
    {
      slug: "shipping",
      title: "Shipping",
      description: "Delivery times and costs across Pakistan.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "paragraph", text: "We deliver across Pakistan with tracked courier partners. Orders placed before 3 PM on a working day leave our warehouse the same day." },
        { type: "heading", text: "Delivery costs", level: 2 },
        { type: "list", items: ["Standard delivery (2–5 working days): Rs. 250", "Free standard delivery on orders above PKR 5,000", "Express delivery in Karachi, Lahore and Islamabad (1–2 working days): Rs. 600"] },
        { type: "heading", text: "Cash on delivery", level: 2 },
        { type: "paragraph", text: "Cash on delivery is available on every order. Please keep the exact amount ready for the rider." },
        { type: "cta", text: "Questions about a delivery?", label: "Contact us", href: "/contact" },
      ],
    },
    {
      slug: "returns",
      title: "Returns",
      description: "Our 7-day return policy for new and pre-loved pairs.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "paragraph", text: "You have 7 days from delivery to return a pair." },
        { type: "heading", text: "Brand-new pairs", level: 2 },
        { type: "list", items: ["Unworn, with all tags and the original box", "Refunds go back to your original payment method, or by bank transfer for cash-on-delivery orders", "Return delivery is free if we sent the wrong pair or size"] },
        { type: "heading", text: "Pre-loved pairs", level: 2 },
        { type: "paragraph", text: "Pre-loved pairs can be returned if they don't match the condition described on the listing." },
        { type: "heading", text: "How to return", level: 2 },
        { type: "list", ordered: true, items: ["Open your order from Account → Orders or your confirmation email", "Choose Request a return and tell us why", "We'll arrange a pickup and refund you once the pair reaches us"] },
      ],
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      description: "How Sole Drop collects and uses your personal data.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "callout", title: "Draft for the owner's review", text: "This policy describes what the store software actually does. Have it reviewed before launch." },
        { type: "heading", text: "What we collect", level: 2 },
        { type: "list", items: ["Order details: name, phone, email and delivery address", "Account details if you create one: email and a securely hashed password", "Newsletter sign-ups: your email address and when you agreed", "Messages you send through the contact form"] },
        { type: "heading", text: "How we use it", level: 2 },
        { type: "paragraph", text: "Only to deliver your order, provide customer service, and — if you subscribed — send you news about new drops. We never sell your data." },
        { type: "heading", text: "Cookies", level: 2 },
        { type: "paragraph", text: "We use strictly necessary cookies to keep your bag and sign-in working. We don't use advertising cookies." },
        { type: "heading", text: "Your rights", level: 2 },
        { type: "paragraph", text: "You can download or delete your account data from Account → Privacy, unsubscribe from any email, or contact us to correct your details." },
      ],
    },
    {
      slug: "terms",
      title: "Terms of Sale",
      description: "The terms that apply when you buy from Sole Drop.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "callout", title: "Draft for the owner's review", text: "Have these terms reviewed before launch." },
        { type: "paragraph", text: "Prices are in Pakistani rupees and include GST. An order is a contract once we confirm it by email. We may cancel an order if a pair is no longer available, in which case any payment is refunded in full." },
      ],
    },
    {
      slug: "about",
      title: "About Sole Drop",
      description: "New and pre-loved footwear from brands you love.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "paragraph", text: "Sole Drop sells brand-new and pre-loved footwear from the brands you love — ASICS, Nike, adidas, HOKA, Brooks and more." },
        { type: "paragraph", text: "Every brand-new pair is sourced from authorised distributors. Every pre-loved pair is inspected, cleaned, graded and photographed, so the pair you see is the pair you get." },
        { type: "cta", text: "Fresh finds. Fresh steps.", label: "Shop new arrivals", href: "/collections/new-arrivals" },
      ],
    },
    {
      slug: "our-story",
      title: "Our Story",
      description: "Why we started Sole Drop.",
      updatedAt,
      seo: {},
      blocks: [
        { type: "paragraph", text: "Sole Drop started in Karachi with a simple idea: great shoes shouldn't be hard to find, and good shoes shouldn't go to waste." },
        { type: "paragraph", text: "So we built one place for new releases and second-chance pairs — honest about condition, quick to deliver, and easy to return." },
      ],
    },
  ],
}
