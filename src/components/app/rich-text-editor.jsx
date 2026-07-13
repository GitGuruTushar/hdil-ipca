"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Heading2 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// Toolbar is deliberately limited to exactly the tags utils/sanitizeRichText.js
// allowlists server-side — anything a user could produce here survives the
// backend sanitizer unchanged, so there's no "it looked fine, then got stripped".
export default function RichTextEditor({ value, onChange, placeholder = "Write something…" }) {
  const { t } = useI18n();
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: { class: "ProseMirror rich-content px-3 py-2.5" },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const btn = (active, onClick, Icon, label) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`h-7 w-7 rounded-lg flex items-center justify-center ${active ? "bg-white text-madder" : "text-body hover:bg-white/70"}`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
    </button>
  );

  return (
    <div className="rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-0.5 bg-ivory p-1.5 border-b border-line">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold, t("shared.forms.richTextEditor.boldLabel", "Bold"))}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic, t("shared.forms.richTextEditor.italicLabel", "Italic"))}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, t("shared.forms.richTextEditor.headingLabel", "Heading"))}
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List, t("shared.forms.richTextEditor.bulletListLabel", "Bullet list"))}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, t("shared.forms.richTextEditor.numberedListLabel", "Numbered list"))}
        {btn(editor.isActive("link"), () => {
          const url = window.prompt(t("shared.forms.richTextEditor.linkUrlPrompt", "Link URL"));
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }, LinkIcon, t("shared.forms.richTextEditor.linkLabel", "Link"))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
