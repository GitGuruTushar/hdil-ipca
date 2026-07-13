"use client";
import { Users } from "lucide-react";

function initialsFor(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Shared avatar: renders a profile photo when `src` is provided, otherwise
// falls back to the existing gradient-initials look (or a group icon).
export default function Avatar({ isGroup, name, src, size = "h-10 w-10", textSize = "text-[12px]" }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || ""}
        className={`${size} rounded-full object-cover flex-none bg-ivory`}
      />
    );
  }

  if (isGroup) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-madder to-grape flex items-center justify-center flex-none`}>
        <Users className="h-4 w-4 text-white" strokeWidth={2} />
      </div>
    );
  }

  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-madder to-grape text-white ${textSize} font-bold flex items-center justify-center flex-none`}>
      {initialsFor(name)}
    </div>
  );
}
