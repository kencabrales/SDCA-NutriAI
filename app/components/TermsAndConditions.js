'use client';

import React from 'react';

const sections = [
  {
    title: 'Voluntary Participation and Informed Consent',
    body: 'Participation in the study is entirely voluntary. Respondents must provide written informed consent before participating. They may refuse to answer any question or withdraw their participation before submitting their responses without penalty.'
  },
  {
    title: 'Collection and Use of Personal Information',
    body: 'The study may collect body weight measurements, dietary records, and health-risk indicators for research and system evaluation purposes. These data shall be handled with strict confidentiality in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).'
  },
  {
    title: 'Confidentiality and Anonymity',
    body: 'Questionnaire responses shall be collected anonymously. Any identifying information voluntarily provided by respondents shall be removed before analysis and replaced with an alphanumeric code to protect their identities.'
  },
  {
    title: 'Data Storage and Security',
    body: 'All collected research data shall be stored on a password-protected device accessible only to the researchers and the project adviser. Appropriate measures shall be maintained to prevent unauthorized access, disclosure, or use of the collected information.'
  },
  {
    title: 'Data Retention and Disposal',
    body: 'Research data shall be retained for no longer than one (1) year after the final defense. Upon expiration of this period, all collected data shall be permanently deleted.'
  },
  {
    title: 'Use and Disclosure of Research Results',
    body: 'Only aggregated and de-identified data shall be included in the research manuscript, academic presentations, and other outputs related to this study. Individual respondents shall not be personally identified in any published or presented results.'
  },
  {
    title: 'Health-Risk Information Disclaimer',
    body: 'The system\'s health-risk assessments and dietary recommendations are intended for informational purposes only and shall not be considered professional medical advice or a clinical diagnosis. The system is not designed to diagnose, treat, or prevent any disease. Respondents are encouraged to consult qualified healthcare professionals for medical concerns.'
  },
  {
    title: 'Scope of Evaluation',
    body: 'The study does not involve vulnerable populations or clinical and medical procedures. Participation is limited to the evaluation of the system and the collection of data necessary for the research.'
  }
];

export const TERMS_VERSION = '2026-11-17';

export default function TermsAndConditions({ accepted, onAcceptedChange }) {
  return (
    <section className="mt-4 rounded-xl border border-gray-700 bg-[#161F30] p-3">
      <div className="mb-2">
        <h3 className="text-sm font-bold text-white">Terms and Conditions</h3>
        <p className="text-[10px] text-gray-400 mt-1">
          Please review the research participation and data handling terms before creating your account.
        </p>
      </div>

      <div
        tabIndex={0}
        aria-label="Terms and Conditions"
        className="max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-[#1C2638] p-3 space-y-3"
      >
        {sections.map((section, index) => (
          <article key={section.title}>
            <h4 className="text-[11px] font-bold text-emerald-400">
              {index + 1}. {section.title}
            </h4>
            <p className="mt-1 text-[10px] leading-relaxed text-gray-300">{section.body}</p>
          </article>
        ))}
        <p className="text-[10px] leading-relaxed text-gray-300 border-t border-gray-700 pt-3">
          By proceeding with the study, respondents acknowledge that they have been informed of these conditions and understand how their information will be collected, handled, stored, and used for research purposes.
        </p>
      </div>

      <label className="mt-3 flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
          required
        />
        <span className="text-[11px] leading-relaxed text-gray-200">
          I have read and agree to the Terms and Conditions.
          <span className="text-red-400"> *</span>
        </span>
      </label>
    </section>
  );
}
