import { Avatar } from './Avatar';
import { Row } from './List';
import { formatDistance, personSubtitle } from '../lib/format';
import type { Person } from '../types';

interface Props {
  person: Person;
  distanceMeters?: number | null;
  /** Replaces the default subtitle line. */
  subtitle?: string;
  /** Trailing badge, e.g. a match score. */
  badge?: string;
  onSelect?: (person: Person) => void;
  state?: unknown;
}

export function PersonRow({ person, distanceMeters, subtitle, badge, onSelect, state }: Props) {
  const trailing = badge ? (
    <span className="badge">{badge}</span>
  ) : distanceMeters !== undefined && distanceMeters !== null ? (
    <span>{formatDistance(distanceMeters)}</span>
  ) : undefined;

  return (
    <Row
      leading={<Avatar person={person} />}
      title={person.name}
      subtitle={subtitle ?? personSubtitle(person)}
      trailing={trailing}
      chevron
      to={onSelect ? undefined : `/person/${person.id}`}
      state={state}
      onClick={onSelect ? () => onSelect(person) : undefined}
    />
  );
}
