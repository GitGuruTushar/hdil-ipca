"use client";

import { useEffect, useState } from "react";
import axiosInstance from "@/utils/axiosInstance";
import { useI18n } from "@/i18n/I18nProvider";
import ChipInput from "@/components/app/chip-input";
import { DirectoryPicker, SelectedChips } from "@/components/app/messages/directory-picker";

const AUDIENCE_OPTIONS = [
  { value: "everyone", key: "shared.targeting.audience.everyone", label: "Everyone" },
  { value: "owners", key: "shared.targeting.audience.owners", label: "Owners" },
  { value: "tenants", key: "shared.targeting.audience.tenants", label: "Tenants" },
];

const labelClass = "block text-[11px] font-bold text-body uppercase tracking-wide mb-1";
const fieldClass =
  "w-full h-9 px-3 rounded-xl border border-line bg-white text-[13px] text-ink placeholder:text-body/60 outline-none focus:border-madder";

function AudiencePillSelect({ value, onChange }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2">
      {AUDIENCE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={
            value === opt.value
              ? "h-9 px-4 rounded-full text-[13px] font-bold text-white bg-gradient-to-r from-madder to-grape"
              : "h-9 px-4 rounded-full text-[13px] font-bold text-ink border border-line bg-white"
          }
        >
          {t(opt.key, opt.label)}
        </button>
      ))}
    </div>
  );
}

// Shared targeting UI for Notices and Documents alike — one component built
// once, per the Phase 6 decision that both consumers share the exact same
// targeting mechanism. value = { targetAudience, targetBuildings, targetGalas,
// targetUsers }. Hand-picked people are additive: OR'd on top of the normal
// audience/building/gala match, never a replacement (enforced server-side in
// each route's matching logic, not here).
export default function TargetingPicker({ value, onChange }) {
  const { t } = useI18n();
  const targetAudience = value?.targetAudience || "everyone";
  const targetBuildings = value?.targetBuildings || [];
  const targetGalas = value?.targetGalas || [];
  const targetUsers = value?.targetUsers || [];

  const [pickerBuilding, setPickerBuilding] = useState("");
  const [pickerGala, setPickerGala] = useState("");
  const [galaOptions, setGalaOptions] = useState([]);
  const [loadingGalas, setLoadingGalas] = useState(false);

  const buildingNum = Number(pickerBuilding);
  const hasValidBuilding = pickerBuilding !== "" && Number.isFinite(buildingNum);

  useEffect(() => {
    setPickerGala("");
    if (!hasValidBuilding) {
      setGalaOptions([]);
      return;
    }
    setLoadingGalas(true);
    axiosInstance
      .get("/auth/directory/galas", { params: { buildingNumber: buildingNum } })
      .then((res) => setGalaOptions(res.data.galas || []))
      .catch(() => setGalaOptions([]))
      .finally(() => setLoadingGalas(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerBuilding]);

  const togglePerson = (user) => {
    const exists = targetUsers.some((u) => u._id === user._id);
    const next = exists ? targetUsers.filter((u) => u._id !== user._id) : [...targetUsers, user];
    onChange({ ...value, targetUsers: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>{t("shared.targeting.audienceLabel", "Audience")}</label>
        <AudiencePillSelect value={targetAudience} onChange={(next) => onChange({ ...value, targetAudience: next })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t("shared.targeting.buildingsLabel", "Buildings (leave empty for all)")}</label>
          <ChipInput
            value={targetBuildings.map(String)}
            onChange={(strs) => onChange({ ...value, targetBuildings: strs.map(Number).filter(Number.isFinite) })}
            placeholder={t("shared.targeting.buildingsPlaceholder", "Add a building number…")}
          />
        </div>
        <div>
          <label className={labelClass}>{t("shared.targeting.galasLabel", "Galas (leave empty for all)")}</label>
          <ChipInput
            value={targetGalas.map(String)}
            onChange={(strs) => onChange({ ...value, targetGalas: strs.map(Number).filter(Number.isFinite) })}
            placeholder={t("shared.targeting.galasPlaceholder", "Add a gala number…")}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>{t("shared.targeting.peopleLabel", "Add specific people (additive, on top of the above)")}</label>
        <SelectedChips selected={targetUsers} onRemove={togglePerson} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          <input
            type="number"
            value={pickerBuilding}
            onChange={(e) => setPickerBuilding(e.target.value)}
            placeholder={t("shared.targeting.peoplePickerBuildingPlaceholder", "Building number…")}
            className={fieldClass}
          />
          <select
            value={pickerGala}
            onChange={(e) => setPickerGala(e.target.value)}
            disabled={!hasValidBuilding || loadingGalas}
            className={`${fieldClass} disabled:opacity-50`}
          >
            <option value="">
              {loadingGalas ? t("shared.targeting.peoplePickerLoadingGalas", "Loading…") : t("shared.targeting.peoplePickerAnyGala", "Any gala")}
            </option>
            {galaOptions.map((g) => (
              <option key={g} value={g}>
                {t("directory.galaPrefix", "Gala")} {g}
              </option>
            ))}
          </select>
        </div>
        {hasValidBuilding ? (
          <DirectoryPicker selected={targetUsers} onToggle={togglePerson} buildingNumber={buildingNum} galaNumber={pickerGala ? Number(pickerGala) : undefined} />
        ) : (
          <p className="text-[11.5px] text-body/70">
            {t("shared.targeting.peoplePickerHint", "Enter a building number above to search for people to add.")}
          </p>
        )}
      </div>
    </div>
  );
}
