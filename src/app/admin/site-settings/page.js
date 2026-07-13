"use client";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import axiosInstance, { apiErrorMessage } from "@/utils/axiosInstance";
import PageHeader from "@/components/app/page-header";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/I18nProvider";
import { LANGS, emptyLocalized } from "@/utils/localizedContent";
import RepeatableList from "@/components/app/repeatable-list";
import ChipInput from "@/components/app/chip-input";
import { SectionCard, Field, FieldGrid, LocalizedInput, LocalizedTextarea, PlainInput } from "../site-content/fields";

const LANG_LABEL = { en: "EN", hi: "HI", mr: "MR" };
const NAV_VARIANTS = ["link", "emergency", "cta"];
const PUBLIC_ROUTES = ["/", "/about", "/directory", "/updates", "/gallery", "/helpline", "/contact"];

const set = (data, patch) => ({ ...data, ...patch });

export default function SiteSettingsPage() {
  const { t, lang: uiLang } = useI18n();
  const { toast } = useToast();

  const [activeLang, setActiveLang] = useState(uiLang || "en");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    axiosInstance
      .get("/site-settings")
      .then((res) => setData(res.data))
      .catch((err) => {
        toast({ title: apiErrorMessage(err, t("admin.website.siteSettings.toast.loadFailed", "Couldn't load site settings")), variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [t, toast]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Strip server-owned fields — the route replaces top-level keys wholesale,
      // and _id must never be sent back as part of the update body.
      const { _id, __v, createdAt, updatedAt, updatedBy, ...payload } = data || {};
      const res = await axiosInstance.put("/site-settings", payload);
      setData(res.data);
      toast({ title: t("admin.website.siteSettings.toast.saved", "Site settings saved") });
    } catch (err) {
      toast({ title: apiErrorMessage(err, t("admin.website.siteSettings.toast.saveFailed", "Couldn't save site settings")), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const d = data || {};
  const brand = d.brand || {};
  const contact = d.contactInfo || {};
  const footer = d.footer || {};
  const loginLink = d.loginLink || { label: emptyLocalized(), href: "/login" };

  return (
    <div>
      <PageHeader
        title={t("admin.website.siteSettings.title", "Site settings")}
        description={t("admin.website.siteSettings.description", "Navigation, footer, contact details and SEO shared across the whole public site.")}
        action={
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape disabled:opacity-60 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {saving ? t("admin.website.siteSettings.saving", "Saving…") : t("admin.website.siteSettings.save", "Save changes")}
          </button>
        }
      />

      <div className="app-glass rounded-2xl flex items-center justify-between px-4 py-2.5 mb-4">
        <span className="text-[12px] text-body">
          {t("admin.website.siteContent.editingLanguage", "Editing language")}{" "}
          <span className="text-ink font-semibold">— {t(`shared.languages.${activeLang}`, activeLang.toUpperCase())}</span>
        </span>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setActiveLang(l)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-full border ${
                activeLang === l ? "border-madder text-madder bg-madder/5" : "border-line text-body bg-white"
              }`}
            >
              {LANG_LABEL[l]}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="app-glass glass-shadow rounded-2xl flex items-center justify-center gap-3 p-16 text-sm text-body">
          <Loader2 className="h-5 w-5 animate-spin text-madder" />
          {t("admin.website.siteSettings.loading", "Loading…")}
        </div>
      ) : (
        <>
          <SectionCard title={t("admin.website.siteSettings.brand", "Brand")}>
            <FieldGrid>
              <Field label={t("admin.website.siteSettings.brandName", "Name")}>
                <PlainInput value={brand.name} onChange={(v) => setData(set(d, { brand: set(brand, { name: v }) }))} placeholder="HDIL-IPCA" />
              </Field>
              <Field label={t("admin.website.siteSettings.brandShort", "Short name")}>
                <PlainInput value={brand.short} onChange={(v) => setData(set(d, { brand: set(brand, { short: v }) }))} placeholder="IPCA" />
              </Field>
            </FieldGrid>
            <Field label={t("admin.website.siteSettings.brandFullForm", "Full form")}>
              <LocalizedInput value={brand.fullForm} lang={activeLang} onChange={(v) => setData(set(d, { brand: set(brand, { fullForm: v }) }))} />
            </Field>
            <Field label={t("admin.website.siteSettings.brandTagline", "Tagline")}>
              <LocalizedInput value={brand.tagline} lang={activeLang} onChange={(v) => setData(set(d, { brand: set(brand, { tagline: v }) }))} />
            </Field>
          </SectionCard>

          <SectionCard title={t("admin.website.siteSettings.nav", "Navigation")} hint={t("admin.website.siteSettings.navHint", "Shown in the navbar and footer")}>
            <RepeatableList
              items={d.nav || []}
              onChange={(nav) => setData(set(d, { nav }))}
              addLabel={t("admin.website.siteSettings.addNavItem", "Add nav item")}
              newItem={() => ({ label: emptyLocalized(), href: "/", variant: "link" })}
              renderItem={(item, i, update) => (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_110px] gap-2">
                  <LocalizedInput value={item.label} lang={activeLang} onChange={(v) => update({ ...item, label: v })} placeholder={t("shared.forms.labelPlaceholder", "Label")} />
                  <PlainInput value={item.href} onChange={(v) => update({ ...item, href: v })} placeholder="/about" />
                  <select
                    value={item.variant}
                    onChange={(e) => update({ ...item, variant: e.target.value })}
                    className="h-10 px-2 rounded-xl border border-line bg-white text-[12.5px] text-ink"
                  >
                    {NAV_VARIANTS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          </SectionCard>

          <SectionCard title={t("admin.website.siteSettings.loginLink", "Login link")}>
            <FieldGrid>
              <Field label={t("shared.forms.labelPlaceholder", "Label")}>
                <LocalizedInput value={loginLink.label} lang={activeLang} onChange={(v) => setData(set(d, { loginLink: set(loginLink, { label: v }) }))} />
              </Field>
              <Field label={t("admin.website.siteSettings.href", "Link")}>
                <PlainInput value={loginLink.href} onChange={(v) => setData(set(d, { loginLink: set(loginLink, { href: v }) }))} placeholder="/login" />
              </Field>
            </FieldGrid>
          </SectionCard>

          <SectionCard title={t("admin.website.siteSettings.footer", "Footer")}>
            <FieldGrid>
              <Field label={t("admin.website.siteSettings.ctaHeading", "CTA heading")}>
                <LocalizedInput value={footer.ctaHeading} lang={activeLang} onChange={(v) => setData(set(d, { footer: set(footer, { ctaHeading: v }) }))} />
              </Field>
              <Field label={t("admin.website.siteSettings.ctaHeadingEm", "CTA heading (emphasis)")}>
                <LocalizedInput value={footer.ctaHeadingEm} lang={activeLang} onChange={(v) => setData(set(d, { footer: set(footer, { ctaHeadingEm: v }) }))} />
              </Field>
            </FieldGrid>
            <FieldGrid>
              <Field label={t("admin.website.siteSettings.ctaButtonLabel", "CTA button label")}>
                <LocalizedInput value={footer.ctaButtonLabel} lang={activeLang} onChange={(v) => setData(set(d, { footer: set(footer, { ctaButtonLabel: v }) }))} />
              </Field>
              <Field label={t("admin.website.siteSettings.ctaButtonHref", "CTA button link")}>
                <PlainInput value={footer.ctaButtonHref} onChange={(v) => setData(set(d, { footer: set(footer, { ctaButtonHref: v }) }))} placeholder="/contact" />
              </Field>
            </FieldGrid>
            <Field label={t("admin.website.siteSettings.blurb", "Blurb")}>
              <LocalizedInput value={footer.blurb} lang={activeLang} onChange={(v) => setData(set(d, { footer: set(footer, { blurb: v }) }))} />
            </Field>
            <Field label={t("admin.website.siteSettings.copyright", "Copyright line")}>
              <LocalizedInput value={footer.copyright} lang={activeLang} onChange={(v) => setData(set(d, { footer: set(footer, { copyright: v }) }))} />
            </Field>
          </SectionCard>

          <SectionCard
            title={t("admin.website.siteSettings.contactInfo", "Contact info")}
            hint={t("admin.website.siteSettings.contactInfoHint", "Not translated — addresses and numbers aren't language content")}
          >
            <Field label={t("admin.website.siteSettings.officeLine", "Office line")}>
              <PlainInput value={contact.officeLine} onChange={(v) => setData(set(d, { contactInfo: set(contact, { officeLine: v }) }))} />
            </Field>
            <Field label={t("admin.website.siteSettings.addressLines", "Address lines")}>
              <ChipInput
                value={contact.addressLines || []}
                onChange={(v) => setData(set(d, { contactInfo: set(contact, { addressLines: v }) }))}
                placeholder={t("admin.website.siteSettings.addressLinePlaceholder", "Add an address line and press Enter…")}
              />
            </Field>
            <FieldGrid>
              <Field label={t("admin.website.siteSettings.email", "Email")}>
                <PlainInput value={contact.email} onChange={(v) => setData(set(d, { contactInfo: set(contact, { email: v }) }))} />
              </Field>
              <Field label={t("admin.website.siteSettings.phone", "Phone")}>
                <PlainInput value={contact.phone} onChange={(v) => setData(set(d, { contactInfo: set(contact, { phone: v }) }))} />
              </Field>
            </FieldGrid>
            <Field label={t("admin.website.siteSettings.whatsapp", "WhatsApp")}>
              <PlainInput value={contact.whatsapp} onChange={(v) => setData(set(d, { contactInfo: set(contact, { whatsapp: v }) }))} />
            </Field>
            <Field label={t("admin.website.siteSettings.hours", "Hours")}>
              <RepeatableList
                items={contact.hours || []}
                onChange={(hours) => setData(set(d, { contactInfo: set(contact, { hours }) }))}
                addLabel={t("admin.website.siteSettings.addHoursRow", "Add hours row")}
                newItem={() => ({ days: "", time: "" })}
                renderItem={(row, i, update) => (
                  <div className="grid grid-cols-2 gap-2">
                    <PlainInput value={row.days} onChange={(v) => update({ ...row, days: v })} placeholder="Monday – Saturday" />
                    <PlainInput value={row.time} onChange={(v) => update({ ...row, time: v })} placeholder="10:00 – 18:00 IST" />
                  </div>
                )}
              />
            </Field>
          </SectionCard>

          <SectionCard
            title={t("admin.website.siteSettings.seo", "SEO")}
            hint={t("admin.website.siteSettings.seoHint", "Takes effect on the next deploy, not live like page content")}
          >
            <RepeatableList
              items={d.seo || []}
              onChange={(seo) => setData(set(d, { seo }))}
              addLabel={t("admin.website.siteSettings.addSeoEntry", "Add SEO entry")}
              newItem={() => ({ route: "/", title: emptyLocalized(), description: emptyLocalized() })}
              renderItem={(entry, i, update) => (
                <div className="border border-line rounded-xl p-3 mb-1 w-full">
                  <select
                    value={entry.route}
                    onChange={(e) => update({ ...entry, route: e.target.value })}
                    className="h-9 px-2 mb-2 rounded-lg border border-line bg-white text-[12.5px] text-ink"
                  >
                    {PUBLIC_ROUTES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <div className="mb-2">
                    <LocalizedInput
                      value={entry.title}
                      lang={activeLang}
                      onChange={(v) => update({ ...entry, title: v })}
                      placeholder={t("admin.website.siteSettings.seoTitlePlaceholder", "Page title")}
                    />
                  </div>
                  <LocalizedTextarea
                    value={entry.description}
                    lang={activeLang}
                    onChange={(v) => update({ ...entry, description: v })}
                    rows={2}
                    placeholder={t("admin.website.siteSettings.seoDescriptionPlaceholder", "Meta description")}
                  />
                </div>
              )}
            />
          </SectionCard>

          <SectionCard title={t("admin.website.siteSettings.theme", "Theme & language")}>
            <FieldGrid>
              <Field label={t("admin.website.siteSettings.themeColor", "Theme color")}>
                <input
                  type="color"
                  value={d.themeColor || "#4F46E2"}
                  onChange={(e) => setData(set(d, { themeColor: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-line"
                />
              </Field>
              <Field label={t("admin.website.siteSettings.defaultLang", "Default language")}>
                <select
                  value={d.defaultLang || "en"}
                  onChange={(e) => setData(set(d, { defaultLang: e.target.value }))}
                  className="h-10 px-3 w-full rounded-xl border border-line bg-white text-[13.5px] text-ink"
                >
                  {LANGS.map((l) => (
                    <option key={l} value={l}>
                      {LANG_LABEL[l]}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldGrid>
          </SectionCard>
        </>
      )}
    </div>
  );
}
