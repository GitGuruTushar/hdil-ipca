"use client";
import { useRef } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon, Film } from "lucide-react";
import { useNicknames } from "@/hooks/use-nicknames";
import { getDisplayName } from "@/utils/displayName";

function FileIcon({ file }) {
  if (file.type.startsWith("image/")) return <ImageIcon className="h-3.5 w-3.5" />;
  if (file.type.startsWith("video/")) return <Film className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

export default function Composer({
  draft,
  onDraftChange,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
  files,
  onFilesSelected,
  onRemoveFile,
  sending,
  textareaRef,
}) {
  const { nicknames } = useNicknames();
  const fileInputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const autoGrow = (e) => {
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
    onDraftChange(el.value);
    onTyping();
  };

  const handleFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    if (list.length) onFilesSelected(list);
    e.target.value = "";
  };

  return (
    <div className="flex-none border-t border-line">
      {replyingTo && (
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-ivory border-b border-line">
          <div className="min-w-0 flex-1 border-l-2 border-madder pl-2">
            <div className="text-[10.5px] font-bold text-madder">{getDisplayName(replyingTo.sender, nicknames)}</div>
            <div className="text-[11px] text-body truncate">{replyingTo.content || "[attachment]"}</div>
          </div>
          <button type="button" onClick={onCancelReply} aria-label="Cancel reply" className="text-body/60 flex-none">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-line">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[11px] font-semibold pl-2 pr-1 py-1 rounded-full bg-ivory text-ink">
              <FileIcon file={f} />
              <span className="truncate max-w-[100px]">{f.name}</span>
              <button type="button" onClick={() => onRemoveFile(i)} aria-label={`Remove ${f.name}`} className="opacity-60 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="p-2.5 flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          className="h-10 w-10 rounded-full border border-line bg-white flex items-center justify-center flex-none text-body"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={autoGrow}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Type a message…"
          maxLength={2000}
          className="flex-1 resize-none max-h-32 rounded-xl border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder:text-body/50 outline-none focus:border-madder transition-colors"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={(!draft.trim() && !files.length) || sending}
          aria-label="Send message"
          className="h-10 w-10 rounded-full bg-gradient-to-r from-madder to-grape text-white flex items-center justify-center flex-none disabled:opacity-50"
        >
          <Send className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
