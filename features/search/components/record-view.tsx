"use client"

import { useEffect } from "react"

import { usePreferences } from "@/context/PreferencesContext"
import type { ViewedProduct } from "@/features/search/types"

/** Adds the open product to "Recently viewed" (this device only); renders nothing. */
export function RecordView({ product }: { product: ViewedProduct }) {
  const { dispatch } = usePreferences()
  const { slug, title, brand, image, price } = product
  useEffect(() => {
    dispatch({ type: "viewed", product: { slug, title, brand, image, price } })
  }, [dispatch, slug, title, brand, image, price])
  return null
}
