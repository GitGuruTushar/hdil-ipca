"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { emptyLocalized } from "@/utils/localizedContent";
import RepeatableList from "@/components/app/repeatable-list";
import { SectionCard, Field, FieldGrid, LocalizedInput, LocalizedTextarea, PlainInput } from "./fields";

const set = (data, patch) => ({ ...data, ...patch });

export default function ContactTab({ data, lang, onChange }) {
  const { t } = useI18n();
  const d = data || {};

  return (
    <>
      <SectionCard title={t("admin.website.siteContent.contact.hero", "Hero")}>
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

      <SectionCard title={t("admin.website.siteContent.contact.map", "Map & directions")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.contact.mapEmbedUrl", "Map embed URL")}>
            <PlainInput value={d.mapEmbedUrl} onChange={(v) => onChange(set(d, { mapEmbedUrl: v }))} placeholder="https://www.google.com/maps?..." />
          </Field>
          <Field label={t("admin.website.siteContent.contact.directionsUrl", "Directions link")}>
            <PlainInput value={d.directionsUrl} onChange={(v) => onChange(set(d, { directionsUrl: v }))} placeholder="https://www.google.com/maps/search/..." />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.contact.responsePromise", "Response-time note")}>
          <LocalizedInput value={d.responsePromise} lang={lang} onChange={(v) => onChange(set(d, { responsePromise: v }))} />
        </Field>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.contact.intents", "Enquiry topics")} hint={t("admin.website.siteContent.contact.intentsHint", "Shown as chips on the contact form")}>
        <RepeatableList
          items={d.intents || []}
          onChange={(intents) => onChange(set(d, { intents }))}
          addLabel={t("admin.website.siteContent.contact.addIntent", "Add topic")}
          newItem={() => emptyLocalized()}
          renderItem={(item, i, update) => (
            <LocalizedInput value={item} lang={lang} onChange={update} placeholder={t("admin.website.siteContent.contact.intentPlaceholder", "e.g. Maintenance")} />
          )}
        />
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.contact.form", "Contact form copy")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.contact.formNameLabel", "Name field label")}>
            <LocalizedInput value={d.formNameLabel} lang={lang} onChange={(v) => onChange(set(d, { formNameLabel: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.contact.formPhoneLabel", "Phone field label")}>
            <LocalizedInput value={d.formPhoneLabel} lang={lang} onChange={(v) => onChange(set(d, { formPhoneLabel: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.contact.formMessageLabel", "Message field label")}>
          <LocalizedInput value={d.formMessageLabel} lang={lang} onChange={(v) => onChange(set(d, { formMessageLabel: v }))} />
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.contact.formNameError", "Name error")}>
            <LocalizedInput value={d.formNameError} lang={lang} onChange={(v) => onChange(set(d, { formNameError: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.contact.formPhoneError", "Phone error")}>
            <LocalizedInput value={d.formPhoneError} lang={lang} onChange={(v) => onChange(set(d, { formPhoneError: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.contact.formMessageError", "Message error")}>
          <LocalizedInput value={d.formMessageError} lang={lang} onChange={(v) => onChange(set(d, { formMessageError: v }))} />
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.contact.formIntentLegend", "Topic-picker legend")}>
            <LocalizedInput value={d.formIntentLegend} lang={lang} onChange={(v) => onChange(set(d, { formIntentLegend: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.contact.formIntentError", "Topic-picker error")}>
            <LocalizedInput value={d.formIntentError} lang={lang} onChange={(v) => onChange(set(d, { formIntentError: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.contact.formSubmitLabel", "Submit button label")}>
          <LocalizedInput value={d.formSubmitLabel} lang={lang} onChange={(v) => onChange(set(d, { formSubmitLabel: v }))} />
        </Field>
        <Field label={t("admin.website.siteContent.contact.formNote", "Helper note")}>
          <LocalizedTextarea value={d.formNote} lang={lang} onChange={(v) => onChange(set(d, { formNote: v }))} rows={2} />
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.contact.formSuccessTitle", "Success title")}>
            <LocalizedInput value={d.formSuccessTitle} lang={lang} onChange={(v) => onChange(set(d, { formSuccessTitle: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.contact.formSuccessText", "Success text")}>
            <LocalizedInput value={d.formSuccessText} lang={lang} onChange={(v) => onChange(set(d, { formSuccessText: v }))} />
          </Field>
        </FieldGrid>
      </SectionCard>
    </>
  );
}
