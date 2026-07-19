import { Code2, ScanLine, ShieldCheck } from "lucide-react";
import { PassportScanner } from "../components/passport/PassportScanner";
import { LanguageSwitcher } from "../components/ui/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export function PassportOCRPage() {
  const { t } = useTranslation();
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">
          <span>
            <ScanLine size={20} />
          </span>
          Passport<span>OCR</span>
        </a>
        <div className="topbar-meta">
          <span>
            <ShieldCheck size={15} /> {t("header.localOnly")}
          </span>
          <LanguageSwitcher />
          <a href="https://github.com" aria-label={t("header.sourceCode")}>
            <Code2 size={18} />
          </a>
        </div>
      </header>
        {/* <section className="hero-section">
          <div className="hero-copy">
            <span className="eyebrow light">{t("hero.eyebrow")}</span>
            <h1>
              {t("hero.title")}
              <br />
              <em>{t("hero.accent")}</em>
            </h1>
            <p>{t("hero.description")}</p>
          </div>
          <div className="passport-mark" aria-hidden="true">
            <div className="passport-lines" />
            <span>
              P&lt;VNMNGUYEN&lt;&lt;TIEN&lt;THU&lt;&lt;&lt;&lt;&lt;&lt;&lt;
            </span>
            <span>C12345678VNM9710181M3303206&lt;&lt;&lt;</span>
          </div>
        </section> */}
      <div className="content-shell">
        {/* <div className="workflow">
          <span className="active">
            1 <b>{t("workflow.upload")}</b>
          </span>
          <i />
          <span>
            2 <b>{t("workflow.extract")}</b>
          </span>
          <i />
          <span>
            3 <b>{t("workflow.review")}</b>
          </span>
        </div> */}
        <PassportScanner />
        <footer>
          <span>{t("footer.author")}</span>
        </footer>
      </div>
    </main>
  );
}
