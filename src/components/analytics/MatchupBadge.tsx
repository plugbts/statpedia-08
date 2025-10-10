import React from "react";
import { getMatchupGradeColor, formatMatchupGrade } from "../../lib/analytics";

interface MatchupBadgeProps {
  grade: number;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export function MatchupBadge({ 
  grade, 
  size = "md", 
  showText = false, 
  className = "" 
}: MatchupBadgeProps) {
  const color = getMatchupGradeColor(grade);
  const text = formatMatchupGrade(grade);
  
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base"
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1 rounded-md font-semibold text-white shadow-sm
        ${sizeClasses[size]}
        ${className}
      `}
      style={{ backgroundColor: color }}
      title={`Matchup Grade: ${grade.toFixed(1)} - ${text}`}
    >
      <span>{grade.toFixed(1)}</span>
      {showText && (
        <>
          <span className="hidden sm:inline">-</span>
          <span className="hidden sm:inline">{text}</span>
        </>
      )}
    </span>
  );
}

// Compact version for tables
export function MatchupBadgeCompact({ grade, className = "" }: { grade: number; className?: string }) {
  const color = getMatchupGradeColor(grade);
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center w-12 h-6 rounded text-xs font-bold text-white
        ${className}
      `}
      style={{ backgroundColor: color }}
      title={`Matchup Grade: ${grade.toFixed(1)} - ${formatMatchupGrade(grade)}`}
    >
      {grade.toFixed(1)}
    </span>
  );
}

// Gradient version for emphasis
export function MatchupBadgeGradient({ grade, className = "" }: { grade: number; className?: string }) {
  const getGradient = (grade: number) => {
    if (grade >= 80) return "from-green-500 to-green-600";
    if (grade >= 60) return "from-lime-500 to-lime-600";
    if (grade >= 40) return "from-amber-500 to-amber-600";
    if (grade >= 20) return "from-red-500 to-red-600";
    return "from-red-700 to-red-800";
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold text-white shadow-lg
        bg-gradient-to-r ${getGradient(grade)}
        ${className}
      `}
      title={`Matchup Grade: ${grade.toFixed(1)} - ${formatMatchupGrade(grade)}`}
    >
      <span>{grade.toFixed(1)}</span>
      <span className="text-xs opacity-90">{formatMatchupGrade(grade)}</span>
    </span>
  );
}
