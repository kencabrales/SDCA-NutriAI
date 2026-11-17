'use client';

import React, { useState } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="mt-4 rounded-xl border border-gray-700 bg-[#161F30] p-3">
        <p className="text-[11px] leading-relaxed text-gray-300">
          Before creating your account, please review the{' '}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="font-semibold text-emerald-400 underline underline-offset-2 hover:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-sm"
          >
            Terms and Conditions
          </button>
          .
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className={`text-[10px] font-medium ${accepted ? 'text-emerald-400' : 'text-gray-400'}`}>
            {accepted ? 'You have agreed to the terms.' : 'Agreement required to register.'}
          </span>
          {accepted && (
            <button
              type="button"
              onClick={() => onAcceptedChange(false)}
              className="text-[10px] text-gray-400 underline hover:text-white"
            >
              Review again
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-dialog-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-[#121A2A] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-gray-700 px-5 py-4">
              <div>
                <h2 id="terms-dialog-title" className="text-base font-bold text-white">
                  Terms and Conditions
                </h2>
                <p className="mt-1 text-[10px] text-gray-400">
                  Please read the following research participation terms carefully.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Terms and Conditions"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              >
                <span aria-hidden="true" className="text-xl leading-none">×</span>
              </button>
            </header>

            <div className="overflow-y-auto px-5 py-4">
              <div className="space-y-4">
                {sections.map((section, index) => (
                  <article key={section.title}>
                    <h3 className="text-xs font-bold text-emerald-400">
                      {index + 1}. {section.title}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-300">{section.body}</p>
                  </article>
                ))}
                <p className="border-t border-gray-700 pt-4 text-xs leading-relaxed text-gray-300">
                  By proceeding with the study, respondents acknowledge that they have been informed of these conditions and understand how their information will be collected, handled, stored, and used for research purposes.
                </p>
              </div>
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-gray-700 bg-[#0F1725] px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-gray-700 px-5 py-2.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-gray-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onAcceptedChange(true);
                  setIsOpen(false);
                }}
                className="rounded-xl bg-[#00A86B] px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#00945D]"
              >
                I Agree
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
