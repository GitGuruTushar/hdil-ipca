"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const tel = (n) => `tel:${(n || "").replace(/[^\d+]/g, "")}`;

// `contactInfo` is SiteSettings.contactInfo (chrome-level: shared with the
// navbar/footer), `responsePromise` is the one contact-page-specific string
// from SiteContent.contact.
export default function ChannelRail({ contactInfo, responsePromise, directionsUrl }) {
  const [copied, setCopied] = useState(false);
  const c = contactInfo || {};
  if (!c.phone && !c.email) return null;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(c.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the mailto link still works */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Call */}
      {c.phone && (
        <a
          href={tel(c.phone)}
          className="group glass glass-shadow hover-lift tap-shrink block rounded-[1.5rem] p-6 md:p-7"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-madder">
            Call the office
          </span>
          <span className="mt-2 block font-display text-2xl font-bold tracking-[-0.015em] text-ink md:text-3xl">
            {c.phone}
          </span>
          {c.hours?.[0] && (
            <span className="mt-1.5 block text-sm text-body">
              {c.hours[0].days} · {c.hours[0].time}
            </span>
          )}
        </a>
      )}

      {/* Email with click-to-copy */}
      {c.email && (
        <div className="glass glass-shadow rounded-[1.5rem] p-6 md:p-7">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-madder">
            Write to us
          </span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${c.email}`}
              className="link-wipe font-display text-lg font-bold text-ink md:text-xl"
            >
              {c.email}
            </a>
            <button
              onClick={copyEmail}
              aria-label={copied ? "Email copied" : "Copy email address"}
              className={`hidden h-9 w-9 items-center justify-center rounded-full border transition-colors duration-200 md:flex ${
                copied
                  ? "border-ok text-ok"
                  : "border-line text-body [@media(hover:hover)]:hover:border-ink [@media(hover:hover)]:hover:text-ink"
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {copied && (
              <span role="status" className="text-xs font-bold text-ok">
                Copied
              </span>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp — appears once a number is set in the content file */}
      {c.whatsapp && (
        <a
          href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(
            "Hello, I have a question for the federation office."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group glass glass-shadow hover-lift tap-shrink block rounded-[1.5rem] p-6 md:p-7"
        >
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-madder">
            WhatsApp
          </span>
          <span className="mt-2 block font-display text-lg font-bold text-ink md:text-xl">
            Message the office <span aria-hidden>→</span>
          </span>
        </a>
      )}

      {/* Visit */}
      <div className="glass glass-shadow rounded-[1.5rem] p-6 md:p-7">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-madder">
          Visit
        </span>
        <p className="mt-2 font-display text-lg font-bold leading-snug text-ink md:text-xl">
          {c.officeLine}
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-body">
          {(c.addressLines || []).join(", ")}
        </p>
        <div className="mt-2.5 space-y-1 text-sm text-body">
          {(c.hours || []).map((h, i) => (
            <p key={i}>
              {h.days} · {h.time}
            </p>
          ))}
        </div>
        {directionsUrl && (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="link-wipe mt-4 inline-block text-sm font-semibold text-madder"
          >
            Get directions <span aria-hidden>→</span>
          </a>
        )}
      </div>

      {/* Trust line */}
      {responsePromise && (
        <div className="flex items-center gap-2.5 px-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-body">{responsePromise}</span>
        </div>
      )}
    </div>
  );
}
