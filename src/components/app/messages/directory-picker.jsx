"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Check } from "lucide-react";
import Avatar from "@/components/app/avatar";
import axiosInstance from "@/utils/axiosInstance";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

// Search + multi-select, shared by the "new message"/"add participants" flows
// (no buildingNumber/galaNumber passed) and TargetingPicker's people-picker
// (both passed, to scope results to a chosen building/gala).
export function DirectoryPicker({ excludeIds, selected, onToggle, buildingNumber, galaNumber, limit = 30 }) {
  const { nicknames } = useNicknames();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const handle = setTimeout(() => {
      axiosInstance
        .get("/auth/directory", { params: { q: query.trim() || undefined, limit, buildingNumber, galaNumber } })
        .then((res) => setResults(res.data.users || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query, buildingNumber, galaNumber, limit]);

  const excludeSet = useMemo(() => new Set(excludeIds || []), [excludeIds]);
  const selectedSet = useMemo(() => new Set((selected || []).map((u) => u._id)), [selected]);
  const visible = results.filter((u) => !excludeSet.has(u._id));

  return (
    <div>
      <div className="flex items-center gap-2 h-9 rounded-full border border-line bg-white px-3 mb-2">
        <Search className="h-3.5 w-3.5 text-body/70 flex-none" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members by name or username…"
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] text-ink placeholder:text-body/60"
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line">
        {loading && <div className="px-3 py-3 text-xs text-body">Searching…</div>}
        {!loading && visible.length === 0 && <div className="px-3 py-3 text-xs text-body">No members found.</div>}
        {!loading &&
          visible.map((u) => {
            const checked = selectedSet.has(u._id);
            const name = getDisplayName(u, nicknames);
            return (
              <button
                key={u._id}
                type="button"
                onClick={() => onToggle(u)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-ivory text-left"
              >
                <Avatar isGroup={false} name={name} src={u.profilePicture} size="h-8 w-8" textSize="text-[10.5px]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-bold text-ink truncate">{name}</div>
                  <div className="text-[11px] text-body truncate">@{u.username}</div>
                </div>
                <span
                  className={`h-5 w-5 rounded-full border flex-none flex items-center justify-center ${
                    checked ? "bg-madder border-madder" : "border-line"
                  }`}
                >
                  {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export function SelectedChips({ selected, onRemove }) {
  const { nicknames } = useNicknames();
  if (!selected.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {selected.map((u) => {
        const name = getDisplayName(u, nicknames);
        return (
          <span
            key={u._id}
            className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2.5 pr-1.5 py-1 rounded-full bg-[#E5E3FB] text-[#4338CA]"
          >
            {name}
            <button type="button" onClick={() => onRemove(u)} aria-label={`Remove ${name}`} className="opacity-60 hover:opacity-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
