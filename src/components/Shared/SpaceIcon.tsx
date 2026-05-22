import BuildingIcon from "@/components/Icons/BuildingIcon";

interface SpaceIconProps {
  className?: string; // Additional classes for the outer wrapper
  iconClassName?: string; // Additional classes for the icon itself
  size?: "sm" | "md" | "lg" | "xl"; // Predefined sizes
  hasMultipleSpaces?: boolean; // Show the stacked background effect
}

export function SpaceIcon({
  className = "",
  size = "md",
  hasMultipleSpaces = false,
}: SpaceIconProps) {
  // Map sizes to Tailwind dimensions
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  };

  const currentSizeClass = sizeClasses[size];
  const currentIconSizeClass = iconSizeClasses[size];

  return (
    <div className={`relative flex-shrink-0 z-10 pointer-events-none perspective-100 ${currentSizeClass} ${className}`}>
      {/* Background stacked icon for multiple spaces */}
      {hasMultipleSpaces && (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-10)] to-[var(--accent-9)] rounded-md flex items-center justify-center text-white shadow-sm transform-gpu translate-x-1 translate-y-1 scale-90 z-10 opacity-60">
          <BuildingIcon className={currentIconSizeClass} />
        </div>
      )}
      
      {/* Main icon */}
      <div className="absolute inset-0 bg-[var(--accent-9)] rounded-md flex items-center justify-center text-[var(--accent-contrast)] shadow-sm z-20 border border-black/10">
        <BuildingIcon className={currentIconSizeClass} />
      </div>
    </div>
  );
}
