"use client"

import Image from "next/image"
import { useState } from "react"

import { cn } from "@/lib/utils"

type GalleryImage = { url: string; alt: string }

/**
 * The product page's 820 px photo with six 120 px thumbnails beneath (Frame 190). Thumbnails are
 * buttons that swap the main photo; the active one carries the dark rule.
 */
export function ProductGallery({ images, title }: { images: GalleryImage[]; title: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  return (
    <div className="flex flex-col gap-4 md:gap-6 3xl:gap-11.5">
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-well">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt}
            fill
            priority
            sizes="(min-width: 1920px) 820px, (min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul aria-label={`${title} photos`} className="grid grid-cols-6 gap-2 md:gap-4 3xl:gap-5">
          {images.map((image, index) => (
            <li key={image.url}>
              <button
                type="button"
                aria-label={`Show photo ${index + 1} of ${images.length}`}
                aria-current={index === active ? "true" : undefined}
                onClick={() => setActive(index)}
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  index === active ? "border-ink-control" : "border-border hover:border-border-strong",
                )}
              >
                <Image src={image.url} alt="" fill sizes="(min-width: 1920px) 120px, 15vw" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
