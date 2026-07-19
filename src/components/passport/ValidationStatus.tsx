import { AlertTriangle, BadgeCheck, ShieldCheck } from "lucide-react";
import type { PassportExtraction } from "../../types/passport";
import { useTranslation } from "react-i18next";

export function ValidationStatus({ result }: { result: PassportExtraction }) {
  const { t } = useTranslation();
  const confidence = Math.round(
    (Object.values(result.confidence).reduce(
      (sum, value) => sum + (value ?? 0),
      0,
    ) /
      Math.max(Object.values(result.confidence).length, 1)) *
      100,
  );
  return (
    <div
      className={`validation-banner ${result.isMrzValid ? "valid" : "warning"}`}
    >
      {result.isMrzValid ? (
        <BadgeCheck size={22} />
      ) : (
        <AlertTriangle size={22} />
      )}
      <div>
        <strong>
          {result.isMrzValid
            ? t("validationStatus.validTitle")
            : t("validationStatus.warningTitle")}
        </strong>
        <p>
          {result.isMrzValid
            ? t("validationStatus.validDescription")
            : t("validationStatus.warningDescription")}
        </p>
      </div>
      <span className="confidence">
        <ShieldCheck size={14} />{" "}
        {t("validationStatus.confidence", { value: confidence })}
      </span>
    </div>
  );
}
