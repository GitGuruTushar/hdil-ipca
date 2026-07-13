"use client";
import { useI18n } from "@/i18n/I18nProvider";
import { emptyLocalized } from "@/utils/localizedContent";
import RepeatableList from "@/components/app/repeatable-list";
import { SectionCard, Field, FieldGrid, LocalizedInput, LocalizedTextarea, PlainInput, ImageUploadField } from "./fields";

const set = (data, patch) => ({ ...data, ...patch });

export default function AboutTab({ data, lang, onChange }) {
  const { t } = useI18n();
  const d = data || {};

  return (
    <>
      <SectionCard title={t("admin.website.siteContent.about.hero", "Hero")}>
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

      <SectionCard title={t("admin.website.siteContent.about.history", "History")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
            <LocalizedInput value={d.historyEyebrow} lang={lang} onChange={(v) => onChange(set(d, { historyEyebrow: v }))} />
          </Field>
          <Field label={t("shared.forms.titleLabel", "Title")}>
            <LocalizedInput value={d.historyTitle} lang={lang} onChange={(v) => onChange(set(d, { historyTitle: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.about.historyIntro", "Intro paragraph")}>
          <LocalizedTextarea value={d.historyIntro} lang={lang} onChange={(v) => onChange(set(d, { historyIntro: v }))} rows={2} />
        </Field>
        <Field label={t("admin.website.siteContent.about.timeline", "Timeline")}>
          <RepeatableList
            items={d.history || []}
            onChange={(history) => onChange(set(d, { history }))}
            addLabel={t("admin.website.siteContent.about.addTimelineEntry", "Add timeline entry")}
            newItem={() => ({ year: "", title: emptyLocalized(), text: emptyLocalized() })}
            renderItem={(entry, i, update) => (
              <div className="grid grid-cols-[72px_1fr] gap-2 mb-2">
                <PlainInput value={entry.year} onChange={(v) => update({ ...entry, year: v })} placeholder="2023" />
                <LocalizedInput value={entry.title} lang={lang} onChange={(v) => update({ ...entry, title: v })} placeholder={t("shared.forms.titleLabel", "Title")} />
                <div className="col-span-2">
                  <LocalizedTextarea value={entry.text} lang={lang} onChange={(v) => update({ ...entry, text: v })} rows={2} />
                </div>
              </div>
            )}
          />
        </Field>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.about.missionVision", "Mission & vision")}>
        <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
          <LocalizedInput value={d.missionVisionEyebrow} lang={lang} onChange={(v) => onChange(set(d, { missionVisionEyebrow: v }))} />
        </Field>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.about.missionTitle", "Mission title")}>
            <LocalizedInput value={d.missionTitle} lang={lang} onChange={(v) => onChange(set(d, { missionTitle: v }))} />
          </Field>
          <Field label={t("admin.website.siteContent.about.visionTitle", "Vision title")}>
            <LocalizedInput value={d.visionTitle} lang={lang} onChange={(v) => onChange(set(d, { visionTitle: v }))} />
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.about.missionText", "Mission text")}>
            <LocalizedTextarea value={d.missionText} lang={lang} onChange={(v) => onChange(set(d, { missionText: v }))} rows={3} />
          </Field>
          <Field label={t("admin.website.siteContent.about.visionText", "Vision text")}>
            <LocalizedTextarea value={d.visionText} lang={lang} onChange={(v) => onChange(set(d, { visionText: v }))} rows={3} />
          </Field>
        </FieldGrid>
      </SectionCard>

      <SectionCard title={t("admin.website.siteContent.about.values", "Values")}>
        <RepeatableList
          items={d.values || []}
          onChange={(values) => onChange(set(d, { values }))}
          addLabel={t("admin.website.siteContent.about.addValue", "Add value")}
          newItem={() => ({ index: String((d.values?.length || 0) + 1).padStart(2, "0"), title: emptyLocalized(), text: emptyLocalized() })}
          renderItem={(value, i, update) => (
            <div className="grid grid-cols-[52px_1fr] gap-2">
              <PlainInput value={value.index} onChange={(v) => update({ ...value, index: v })} placeholder="01" />
              <LocalizedInput value={value.title} lang={lang} onChange={(v) => update({ ...value, title: v })} placeholder={t("shared.forms.titleLabel", "Title")} />
              <div className="col-span-2">
                <LocalizedTextarea value={value.text} lang={lang} onChange={(v) => update({ ...value, text: v })} rows={2} />
              </div>
            </div>
          )}
        />
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

      <SectionCard title={t("admin.website.siteContent.about.leadership", "Leadership")}>
        <FieldGrid>
          <Field label={t("admin.website.siteContent.home.eyebrow", "Eyebrow")}>
            <LocalizedInput value={d.leadershipEyebrow} lang={lang} onChange={(v) => onChange(set(d, { leadershipEyebrow: v }))} />
          </Field>
          <Field label={t("shared.forms.titleLabel", "Title")}>
            <LocalizedInput value={d.leadershipTitle} lang={lang} onChange={(v) => onChange(set(d, { leadershipTitle: v }))} />
          </Field>
        </FieldGrid>
        <Field label={t("admin.website.siteContent.text", "Text")}>
          <LocalizedTextarea value={d.leadershipText} lang={lang} onChange={(v) => onChange(set(d, { leadershipText: v }))} rows={2} />
        </Field>
        <RepeatableList
          items={d.leadership || []}
          onChange={(leadership) => onChange(set(d, { leadership }))}
          addLabel={t("admin.website.siteContent.about.addLeader", "Add leader")}
          newItem={() => ({ name: "", role: emptyLocalized(), photoUrl: "", bio: emptyLocalized() })}
          renderItem={(person, i, update) => (
            <div className="flex items-start gap-3 p-3 border border-line rounded-xl">
              <ImageUploadField value={person.photoUrl} onChange={(url) => update({ ...person, photoUrl: url })} alt={person.name} />
              <div className="flex-1 min-w-0">
                <FieldGrid>
                  <PlainInput value={person.name} onChange={(v) => update({ ...person, name: v })} placeholder={t("admin.website.siteContent.about.nameePlaceholder", "Full name")} />
                  <LocalizedInput value={person.role} lang={lang} onChange={(v) => update({ ...person, role: v })} placeholder={t("admin.website.siteContent.about.rolePlaceholder", "Role")} />
                </FieldGrid>
                <LocalizedTextarea value={person.bio} lang={lang} onChange={(v) => update({ ...person, bio: v })} rows={2} />
              </div>
            </div>
          )}
        />
      </SectionCard>
    </>
  );
}
