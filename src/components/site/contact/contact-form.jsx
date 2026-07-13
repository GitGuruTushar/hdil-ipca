"use client";

// Mailto-powered contact form: intent chips + three fields. On submit it
// opens the visitor's email app pre-filled and swaps to a success state.

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { pickLang } from "@/utils/localizedContent";
import { EASE_EXPO } from "@/components/site/motion";

// `data` is SiteContent.contact (intents/form* copy); `email`/`phone` are
// SiteSettings.contactInfo (chrome-level, shared with the navbar/footer).
export default function ContactForm({ data, lang, email, phone }) {
  const reduce = useReducedMotion();
  const p = (field) => pickLang(field, lang);
  const d = data || {};
  const intents = (d.intents || []).map((i) => p(i)).filter(Boolean);

  const FIELDS = {
    name: {
      label: p(d.formNameLabel) || "Your name",
      type: "text",
      autoComplete: "name",
      error: p(d.formNameError) || "Please tell us your name.",
    },
    phone: {
      label: p(d.formPhoneLabel) || "Phone (optional)",
      type: "tel",
      autoComplete: "tel",
      inputMode: "tel",
      error: p(d.formPhoneError) || "That phone number looks too short.",
    },
  };

  const [intent, setIntent] = useState(null);
  const [values, setValues] = useState({ name: "", phone: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const validateField = (key, v) => {
    if (key === "name" && !v.trim()) return FIELDS.name.error;
    if (key === "phone" && v.trim() && v.replace(/\D/g, "").length < 10)
      return FIELDS.phone.error;
    if (key === "message" && !v.trim())
      return p(d.formMessageError) || "Please write a short message.";
    return null;
  };

  const onBlur = (key) =>
    setErrors((e) => ({ ...e, [key]: validateField(key, values[key]) }));

  const onSubmit = (e) => {
    e.preventDefault();
    const next = {
      intent: intent ? null : p(d.formIntentError) || "Please pick one.",
      name: validateField("name", values.name),
      phone: validateField("phone", values.phone),
      message: validateField("message", values.message),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const subject = `[${intent}] — ${values.name.trim()}`;
    const body = `${values.message.trim()}\n\n— ${values.name.trim()}${
      values.phone.trim() ? `\nPhone: ${values.phone.trim()}` : ""
    }`;
    window.location.href = `mailto:${email || ""}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const reset = () => {
    setSent(false);
    setIntent(null);
    setValues({ name: "", phone: "", message: "" });
    setErrors({});
  };

  const inputCls = (key) =>
    `w-full rounded-none border-0 border-b bg-transparent py-3 text-base text-ink outline-none transition-colors duration-200 placeholder:text-body/50 focus:border-ink ${
      errors[key] ? "border-alarm" : "border-line"
    }`;

  return (
    <div className="glass glass-shadow rounded-[1.75rem] p-6 md:p-10">
      <AnimatePresence mode="wait">
        {sent ? (
          <motion.div
            key="success"
            role="status"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_EXPO }}
            className="py-10 text-center md:py-16"
          >
            <p className="font-display text-[clamp(1.5rem,3.5vw,2.2rem)] font-bold leading-tight tracking-[-0.015em] text-ink">
              {p(d.formSuccessTitle) || "Your email app should be open."}
            </p>
            <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-body">
              {p(d.formSuccessText) || "Press send there and your message reaches the federation office."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              {phone && (
                <a
                  href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                  className="link-wipe text-xs font-semibold uppercase tracking-[0.14em] text-ink"
                >
                  Call us instead <span aria-hidden>→</span>
                </a>
              )}
              <button
                onClick={reset}
                className="link-wipe text-xs font-semibold uppercase tracking-[0.14em] text-body"
              >
                Send another message
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            noValidate
            onSubmit={onSubmit}
            initial={false}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE_EXPO }}
          >
            {/* Intent chips */}
            <fieldset>
              <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body">
                {p(d.formIntentLegend) || "What brings you here?"}
              </legend>
              <div className="mt-4 flex flex-wrap gap-3">
                {intents.map((label) => {
                  const active = intent === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setIntent(label);
                        setErrors((e) => ({ ...e, intent: null }));
                      }}
                      className={`tap-shrink min-h-11 rounded-full px-5 text-xs font-bold transition-all duration-200 ${
                        active
                          ? "bg-gradient-to-r from-madder to-grape text-white shadow-lg shadow-madder/25"
                          : "glass-soft text-body [@media(hover:hover)]:hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {errors.intent && (
                <p className="mt-3 text-xs text-alarm">{errors.intent}</p>
              )}
            </fieldset>

            {/* Fields */}
            <div className="mt-10 space-y-8">
              {Object.entries(FIELDS).map(([key, f]) => (
                <div key={key}>
                  <label
                    htmlFor={`cf-${key}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body"
                  >
                    {f.label}
                  </label>
                  <input
                    id={`cf-${key}`}
                    type={f.type}
                    autoComplete={f.autoComplete}
                    inputMode={f.inputMode}
                    value={values[key]}
                    aria-invalid={Boolean(errors[key])}
                    aria-describedby={errors[key] ? `cf-${key}-err` : undefined}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [key]: e.target.value }))
                    }
                    onBlur={() => onBlur(key)}
                    className={inputCls(key)}
                  />
                  {errors[key] && (
                    <p id={`cf-${key}-err`} className="mt-2 text-xs text-alarm">
                      {errors[key]}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <label
                  htmlFor="cf-message"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-body"
                >
                  {p(d.formMessageLabel) || "Your message"}
                </label>
                <textarea
                  id="cf-message"
                  rows={5}
                  value={values.message}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby={errors.message ? "cf-message-err" : undefined}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, message: e.target.value }))
                  }
                  onBlur={() => onBlur("message")}
                  className={`${inputCls("message")} resize-none`}
                />
                {errors.message && (
                  <p id="cf-message-err" className="mt-2 text-xs text-alarm">
                    {errors.message}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-8 text-xs leading-relaxed text-body">{p(d.formNote)}</p>

            <button
              type="submit"
              className="tap-shrink mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-madder to-grape px-7 py-4 text-sm font-semibold tracking-wide text-white shadow-lg shadow-madder/25 transition-all duration-200 md:w-auto [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:brightness-110"
            >
              {p(d.formSubmitLabel) || "Open email & send"} <span aria-hidden>→</span>
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
