"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { SectionCard, Field, FieldGrid, LocalizedInput, LocalizedTextarea } from "./fields";

const set = (data, patch) => ({ ...data, ...patch });

// Shared by gallery/updates/helpline — each only has a hero section in
// SiteContent (their body content lives in its own dedicated model with
// working admin CRUD already, see Milestone 2).
export default function HeroOnlyTab({ data, lang, onChange }) {
  const { t } = useI18n();
  const d = data || {};

  return (
    <SectionCard title={t("admin.website.siteContent.home.hero", "Hero")}>
      <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
        <LocalizedInput value={d.heroEyebrow} lang={lang} onChange={(v) => onChange(set(d, { heroEyebrow: v }))} />
      </Field>
      <FieldGrid>
        <Field label={t("admin.website.siteContent.home.titleLead", "Title (lead)")}>
          <LocalizedInput value={d.heroTitleLead} lang={lang} onChange={(v) => onChange(set(d, { heroTitleLead: v }))} />
        </Field>
        <Field label={t("admin.website.siteContent.home.titleEm", "Title (emphasis)")}>
          <LocalizedInput value={d.heroTitleEm} lang={lang} onChange={(v) => onChange(set(d, { heroTitleEm: v }))} />
        </Field>
      </FieldGrid>
      <Field label={t("admin.website.siteContent.home.subtitle", "Subtitle")}>
        <LocalizedTextarea value={d.heroSub} lang={lang} onChange={(v) => onChange(set(d, { heroSub: v }))} rows={2} />
      </Field>
    </SectionCard>
  );
}
