import type { ConditionGrade } from "@/server/catalog/types"

/** What each pre-loved grade means, as the Condition Guide writes it (D-015). Best first. */
export const CONDITION_GUIDE: { grade: ConditionGrade; text: string; tone: string }[] = [
  { grade: "like-new", text: "Looks almost brand new. Very clean from top to bottom.", tone: "bg-guide-like-new" },
  { grade: "excellent", text: "Worn a little, but still very clean and in great shape.", tone: "bg-guide-excellent" },
  { grade: "great", text: "Used, but well looked after. Clean, nice, and ready to wear.", tone: "bg-guide-great" },
  { grade: "good", text: "Shows more use, but still looks good and feels fine to wear.", tone: "bg-guide-good" },
  { grade: "minor-marks", text: "May have small marks or flaws. Any issues will be shown in the photos.", tone: "bg-guide-minor-marks" },
]
