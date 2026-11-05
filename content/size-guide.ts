/**
 * Size conversion charts for the Size Guide (screen 08). The men's chart is the design's table;
 * the women's and kids' charts are standard athletic-footwear conversions for the two tabs the
 * design shows but does not fill (D-026) and are listed for the owner to confirm.
 */
export type SizeRow = { eu: string; uk: string; us: string; cm: string }

export type SizeChartId = "men" | "women" | "kids"

export const sizeCharts: { id: SizeChartId; label: string; rows: SizeRow[] }[] = [
  {
    id: "men",
    label: "Men",
    rows: [
      { eu: "40", uk: "6", us: "7", cm: "25" },
      { eu: "41", uk: "7", us: "8", cm: "26" },
      { eu: "42", uk: "8", us: "9", cm: "27" },
      { eu: "43", uk: "9", us: "10", cm: "28" },
      { eu: "44", uk: "10", us: "11", cm: "29" },
      { eu: "45", uk: "11", us: "12", cm: "30" },
      { eu: "46", uk: "12", us: "13", cm: "31" },
      { eu: "47", uk: "13", us: "14", cm: "32" },
    ],
  },
  {
    id: "women",
    label: "Women",
    rows: [
      { eu: "35.5", uk: "3", us: "5", cm: "22" },
      { eu: "36", uk: "3.5", us: "5.5", cm: "22.5" },
      { eu: "37.5", uk: "4.5", us: "6.5", cm: "23.5" },
      { eu: "38", uk: "5", us: "7", cm: "24" },
      { eu: "39", uk: "6", us: "8", cm: "25" },
      { eu: "40", uk: "6.5", us: "8.5", cm: "25.5" },
      { eu: "41", uk: "7.5", us: "9.5", cm: "26.5" },
      { eu: "42", uk: "8", us: "10", cm: "27" },
    ],
  },
  {
    id: "kids",
    label: "Kids",
    rows: [
      { eu: "28", uk: "10.5", us: "11C", cm: "17" },
      { eu: "30", uk: "12", us: "12.5C", cm: "18" },
      { eu: "31", uk: "12.5", us: "13C", cm: "19" },
      { eu: "32", uk: "13.5", us: "1Y", cm: "20" },
      { eu: "33.5", uk: "1", us: "1.5Y", cm: "20.5" },
      { eu: "35", uk: "2.5", us: "3Y", cm: "22" },
      { eu: "36", uk: "3.5", us: "4Y", cm: "23" },
      { eu: "38", uk: "5", us: "5.5Y", cm: "24" },
    ],
  },
]

/** Men's chart keyed by EU size, the conversion the catalogue uses for every new pair. */
export const mensSizeByEu: Record<string, SizeRow> = Object.fromEntries(sizeCharts[0].rows.map((row) => [row.eu, row]))
