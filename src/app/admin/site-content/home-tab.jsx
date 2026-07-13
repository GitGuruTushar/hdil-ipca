"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { emptyLocalized } from "@/utils/localizedContent";
import RepeatableList from "@/components/app/repeatable-list";
import { SectionCard, Field, FieldGrid, LocalizedInput, LocalizedTextarea, PlainInput, ImageUploadField } from "./fields";

const set = (data, patch) => ({ ...data, ...patch });

export default function HomeTab({ data, lang, onChange }) {
  const { t } = useI18n();
  const d = data || {};

  return (
    <>
      <SectionCard title={t("admin.website.siteContent.home.hero", "Hero")}>
        <Field label={t("admin.website.siteContent.home.kicker", "Kicker")}>
          <LocalizedInput value={d.heroKicker} lang={lang} onChange={(v) => onChange(set(d, { heroKicker: v }))} />
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
          <LocalizedTextarea value={d.heroSubtitle} lang={lang} onChange={(v) => onChange(set(d, { heroSubtitle: v }))} rows={2} />
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.primaryCtaLabel", "Primary button label")}>
            <LocalizedInput value={d.heroPrimaryCtaLabel} lang={lang} onChange={(v) => onChange(set(d, { heroPrimaryCtaLabel: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.home.primaryCtaHref", "Primary button link")}>
            <PlainInput value={d.heroPrimaryCtaHref} onChange={(v) => onChange(set(d, { heroPrimaryCtaHref: v }))} placeholder="/about" />
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.secondaryCtaLabel", "Secondary button label")}>
            <LocalizedInput value={d.heroSecondaryCtaLabel} lang={lang} onChange={(v) => onChange(set(d, { heroSecondaryCtaLabel: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.home.secondaryCtaHref", "Secondary button link")}>
            <PlainInput value={d.heroSecondaryCtaHref} onChange={(v) => onChange(set(d, { heroSecondaryCtaHref: v }))} placeholder="/about" />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.home.heroImage", "Hero image")}>
          <div className="flex items-center gap-3">
            <ImageUploadField value={d.heroImageUrl} onChange={(url) => onChange(set(d, { heroImageUrl: url }))} shape="square" alt={d.heroImageAlt?.[lang]} />
            <div className="flex-1">
              <LocalizedInput
                value={d.heroImageAlt}
                lang={lang}
                onChange={(v) => onChange(set(d, { heroImageAlt: v }))}
                placeholder={t("admin.website.siteContent.altTextPlaceholder", "Describe the image for screen readers")}
              />
            </div>
          </div>
        </Field>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.stats", "Stats")} hint={t("admin.website.siteContent.statsHint", "Shown on the home and about pages")}>
        <RepeatableList
          items={d.stats || []}
          onChange={(stats) => onChange(set(d, { stats }))}
          addLabel={t("admin.website.siteContent.addStat", "Add stat")}
          newItem={() => ({ value: 0, suffix: "+", label: emptyLocalized(), short: emptyLocalized(), featured: false })}
          renderItem={(stat, i, update) => (
            <div className="grid grid-cols-[72px_56px_1fr] gap-2">
              <PlainInput type="number" value={stat.value} onChange={(v) => update({ ...stat, value: Number(v) || 0 })} placeholder="14" />
              <PlainInput value={stat.suffix} onChange={(v) => update({ ...stat, suffix: v })} placeholder="+" />
              <LocalizedInput value={stat.label} lang={lang} onChange={(v) => update({ ...stat, label: v })} placeholder={t("admin.website.siteContent.statLabelPlaceholder", "Buildings")} />
            </div>
          )}
        />
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.intro", "Intro section")}>
        <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
          <LocalizedInput value={d.introEyebrow} lang={lang} onChange={(v) => onChange(set(d, { introEyebrow: v }))} />
        </Field>
        <Field label={t("shared.forms.titleLabel", "Title")}>
          <LocalizedInput value={d.introTitle} lang={lang} onChange={(v) => onChange(set(d, { introTitle: v }))} />
        </Field>
        <Field label={t("admin.website.siteContent.text", "Text")}>
          <LocalizedTextarea value={d.introText} lang={lang} onChange={(v) => onChange(set(d, { introText: v }))} rows={3} />
        </Field>
        <Field label={t("admin.website.siteContent.home.introImage", "Image")}>
          <div className="flex items-center gap-3">
            <ImageUploadField value={d.introImageUrl} onChange={(url) => onChange(set(d, { introImageUrl: url }))} shape="square" alt={d.introImageAlt?.[lang]} />
            <div className="flex-1">
              <LocalizedInput value={d.introImageAlt} lang={lang} onChange={(v) => onChange(set(d, { introImageAlt: v }))} placeholder={t("admin.website.siteContent.altTextPlaceholder", "Describe the image for screen readers")} />
            </div>
          </div>
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.linkLabel", "Link label")}>
            <LocalizedInput value={d.introLinkLabel} lang={lang} onChange={(v) => onChange(set(d, { introLinkLabel: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.linkHref", "Link")}>
            <PlainInput value={d.introLinkHref} onChange={(v) => onChange(set(d, { introLinkHref: v }))} placeholder="/about" />
          </Field>
        </FieldGrid>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.industriesMarquee", "Industries marquee")}>
        <RepeatableList
          items={d.industriesMarqueeItems || []}
          onChange={(items) => onChange(set(d, { industriesMarqueeItems: items }))}
          addLabel={t("admin.website.siteContent.addIndustry", "Add industry")}
          newItem={() => emptyLocalized()}
          renderItem={(item, i, update) => (
            <LocalizedInput value={item} lang={lang} onChange={update} placeholder={t("admin.website.siteContent.industryPlaceholder", "e.g. Textiles")} />
          )}
        />
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.newsTeaser", "News teaser")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
            <LocalizedInput value={d.newsTeaserEyebrow} lang={lang} onChange={(v) => onChange(set(d, { newsTeaserEyebrow: v }))} />
          </Field>
          <Field label={t("shared.forms.titleLabel", "Title")}>
            <LocalizedInput value={d.newsTeaserTitle} lang={lang} onChange={(v) => onChange(set(d, { newsTeaserTitle: v }))} />
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.linkLabel", "Link label")}>
            <LocalizedInput value={d.newsTeaserLinkLabel} lang={lang} onChange={(v) => onChange(set(d, { newsTeaserLinkLabel: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.home.itemCount", "Items to show")}>
            <PlainInput type="number" value={d.newsTeaserCount ?? 3} onChange={(v) => onChange(set(d, { newsTeaserCount: Number(v) || 0 }))} />
          </Field>
        </FieldGrid>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.galleryTeaser", "Gallery teaser")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
            <LocalizedInput value={d.galleryTeaserEyebrow} lang={lang} onChange={(v) => onChange(set(d, { galleryTeaserEyebrow: v }))} />
          </Field>
          <Field label={t("shared.forms.titleLabel", "Title")}>
            <LocalizedInput value={d.galleryTeaserTitle} lang={lang} onChange={(v) => onChange(set(d, { galleryTeaserTitle: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.linkLabel", "Link label")}>
          <LocalizedInput value={d.galleryTeaserLinkLabel} lang={lang} onChange={(v) => onChange(set(d, { galleryTeaserLinkLabel: v }))} />
        </Field>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.helplineStrip", "Helpline strip")}>
        <Field label={t("shared.forms.titleLabel", "Title")}>
          <LocalizedInput value={d.helplineStripTitle} lang={lang} onChange={(v) => onChange(set(d, { helplineStripTitle: v }))} />
        </Field>
        <Field label={t("admin.website.siteContent.text", "Text")}>
          <LocalizedTextarea value={d.helplineStripText} lang={lang} onChange={(v) => onChange(set(d, { helplineStripText: v }))} rows={2} />
        </Field>
        <Field label={t("admin.website.siteContent.linkLabel", "Link label")}>
          <LocalizedInput value={d.helplineStripCtaLabel} lang={lang} onChange={(v) => onChange(set(d, { helplineStripCtaLabel: v }))} />
        </Field>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.home.contactStrip", "Contact strip")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.titleLead", "Title (lead)")}>
            <LocalizedInput value={d.contactStrip?.titleLead} lang={lang} onChange={(v) => onChange(set(d, { contactStrip: { ...d.contactStrip, titleLead: v } }))} />
          </Field>
          <Field label={t("admin.website.siteContent.home.titleEm", "Title (emphasis)")}>
            <LocalizedInput value={d.contactStrip?.titleEm} lang={lang} onChange={(v) => onChange(set(d, { contactStrip: { ...d.contactStrip, titleEm: v } }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.text", "Text")}>
          <LocalizedTextarea value={d.contactStrip?.text} lang={lang} onChange={(v) => onChange(set(d, { contactStrip: { ...d.contactStrip, text: v } }))} rows={2} />
        </Field>
        <Field label={t("admin.website.siteContent.linkLabel", "Link label")}>
          <LocalizedInput value={d.contactStrip?.ctaLabel} lang={lang} onChange={(v) => onChange(set(d, { contactStrip: { ...d.contactStrip, ctaLabel: v } }))} />
        </Field>
      </SectionCard>
    </>
  );
}
