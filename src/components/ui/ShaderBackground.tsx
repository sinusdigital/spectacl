'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { MeshGradient } from "@paper-design/shaders-react"

// Radix lime scale values from radix-colors.css
const LIGHT_COLORS = ["#f8fbf7", "#f2f9ef", "#dbface", "#b1ee96", "#7ab560"] as const;
const DARK_COLORS = ["#0d130a", "#131a10", "#1b2b14", "#274915", "#37681c"] as const;

interface ShaderBackgroundProps {
  children?: React.ReactNode;
  scrollable?: boolean;
}

export default function ShaderBackground({ children, scrollable = false }: ShaderBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const colors = mounted && resolvedTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <div className={`absolute inset-0 bg-[var(--color-background)] z-0 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-60 pointer-events-none"
        colors={colors as unknown as string[]}
        speed={0.15}
        maxPixelCount={256 * 256}
      />

      <div className={scrollable
        ? "relative z-10 flex flex-col items-center min-h-full py-8 px-4"
        : "absolute inset-0 z-10 flex items-center justify-center"
      }>
        {children}
      </div>
    </div>
  )
}
