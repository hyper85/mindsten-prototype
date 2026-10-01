import { useNavigate } from 'react-router-dom';
import { Icons } from './Icons';
import { CATEGORY_META, formatDistance, lifespanLabel } from '../lib/format';
import type { Person } from '../types';

interface Props {
  person: Person;
  distanceMeters?: number | null;
  /** Shown instead of distance, e.g. match score or route stop number. */
  badge?: string;
  className?: string;
  onSelect?: (person: Person) => void;
}

export function PersonAvatar({ person, size = 48 }: { person: Person; size?: number }) {
  return (
    <div className="nearby-avatar" style={{ width: size, height: size }} aria-hidden="true">
      {person.imageUrl ? (
        <img src={person.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        person.name.charAt(0)
      )}
    </div>
  );
}

export function PersonListItem({ person, distanceMeters, badge, className = '', onSelect }: Props) {
  const navigate = useNavigate();
  const open = () => (onSelect ? onSelect(person) : navigate(`/person/${person.id}`));
  const meta = [
    person.profession || CATEGORY_META[person.category].label,
    lifespanLabel(person.birthYear, person.deathYear),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      role="button"
      tabIndex={0}
      className={`nearby-card ${className}`}
      aria-label={person.name}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
    >
      <PersonAvatar person={person} />
      <div className="nearby-info">
        <div className="nearby-name">{person.name}</div>
        <div className="nearby-meta">{meta}</div>
        {badge ? (
          <div className="nearby-dist">{badge}</div>
        ) : distanceMeters !== undefined && distanceMeters !== null ? (
          <div className="nearby-dist">
            {Icons.pin} {formatDistance(distanceMeters)} · {person.cemetery}
          </div>
        ) : person.cemetery ? (
          <div className="nearby-dist">
            {Icons.pin} {person.cemetery}
          </div>
        ) : null}
      </div>
    </div>
  );
}
