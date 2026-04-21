import { useState } from 'react';

interface Props {
  onDone: () => void;
}

const STEPS = [
  {
    icon: '🔍',
    cls: 'step0',
    title: 'Scan',
    desc: 'Peg din kamera mod en gravsten — vi fortæller dig hvem der ligger begravet.',
  },
  {
    icon: '🎬',
    cls: 'step1',
    title: 'Tidsvindue',
    desc: 'Se kuraterede videoer der bringer fortiden til live på stedet.',
  },
  {
    icon: '🗺️',
    cls: 'step2',
    title: 'Udforsk',
    desc: 'Følg temaruter og opdag historien i dit nærområde.',
  },
] as const;

export function OnboardingOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding-screen">
      <div className="onboarding-content">
        <div className={`onboarding-icon ${current.cls}`}>{current.icon}</div>
        <div className="onboarding-title">{current.title}</div>
        <div className="onboarding-desc">{current.desc}</div>
        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <div key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
      </div>
      <div className="onboarding-bottom">
        <button
          type="button"
          className="onboarding-next"
          onClick={() => (isLast ? onDone() : setStep(step + 1))}
        >
          {isLast ? 'Kom i gang' : 'Næste'}
        </button>
        <button type="button" className="onboarding-skip" onClick={onDone}>
          Spring over
        </button>
      </div>
    </div>
  );
}
