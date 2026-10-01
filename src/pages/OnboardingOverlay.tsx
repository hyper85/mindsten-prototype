import { Camera, Hourglass, MapPin, ShieldCheck } from 'lucide-react';
import { AppMark } from '../components/Illustrations';

interface Props {
  onDone: () => void;
}

const FEATURES = [
  {
    icon: Camera,
    color: 'var(--tint)',
    title: 'Scan en gravsten',
    text: 'Peg kameraet mod stenen. Vi læser navn og årstal og finder personen.',
  },
  {
    icon: Hourglass,
    color: 'var(--gold)',
    title: 'Rejs tilbage i tiden',
    text: 'Se hvordan Danmark så ud, mens de levede – konger, krige og hverdagsliv.',
  },
  {
    icon: MapPin,
    color: 'var(--blue)',
    title: 'Find kendte grave',
    text: 'Opdag hvor kendte danskere ligger begravet, og følg temaruter.',
  },
];

export function OnboardingOverlay({ onDone }: Props) {
  return (
    <div className="welcome" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
      <AppMark className="welcome-icon" />
      <h1 id="welcome-title" className="welcome-title">
        Velkommen til <span>MindSTEN</span>
      </h1>
      <ul className="features">
        {FEATURES.map(({ icon: Icon, color, title, text }) => (
          <li key={title} className="feature">
            <span className="feature-icon" style={{ color }}>
              <Icon aria-hidden="true" />
            </span>
            <div>
              <div className="feature-title">{title}</div>
              <div className="feature-text">{text}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="welcome-footer">
        <p className="welcome-note">
          <ShieldCheck aria-hidden="true" />
          Ingen konto. Dine data bliver på din telefon.
        </p>
        <button type="button" className="btn btn-primary" onClick={onDone}>
          Kom i gang
        </button>
      </div>
    </div>
  );
}
