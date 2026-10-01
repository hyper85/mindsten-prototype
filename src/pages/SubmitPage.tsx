import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { submitGrave } from '../lib/api';
import { getCurrentPosition } from '../lib/geo';

interface Prefill {
  name?: string;
  birthYear?: number | null;
  deathYear?: number | null;
}

const toYear = (v: string): number | null => {
  const n = Number(v);
  return v.trim() && Number.isInteger(n) && n >= 800 && n <= 2100 ? n : null;
};

export function SubmitPage() {
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as {
    prefill?: Prefill | null;
    inscription?: string;
    correctionFor?: number;
  };
  const [name, setName] = useState(state.prefill?.name ?? '');
  const [birthYear, setBirthYear] = useState(
    state.prefill?.birthYear ? String(state.prefill.birthYear) : '',
  );
  const [deathYear, setDeathYear] = useState(
    state.prefill?.deathYear ? String(state.prefill.deathYear) : '',
  );
  const [cemetery, setCemetery] = useState('');
  const [note, setNote] = useState(
    state.correctionFor
      ? `Rettelse til person #${state.correctionFor}: `
      : state.inscription
        ? `Indskrift: ${state.inscription}`
        : '',
  );
  const [useLocationToo, setUseLocationToo] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'offline' | 'failed'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setStatus('sending');
    const coords = useLocationToo ? await getCurrentPosition(6000) : null;
    const result = await submitGrave({
      name: name.trim(),
      birthYear: toYear(birthYear),
      deathYear: toYear(deathYear),
      cemetery: cemetery.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      note: note.trim(),
    });
    setStatus(result.ok ? 'sent' : result.offline ? 'offline' : 'failed');
  };

  if (status === 'sent') {
    return (
      <div className="profile-screen">
        <PageHeader title="Tak!" />
        <div className="state-panel">
          <div className="state-panel-title">Tak for dit bidrag</div>
          <div className="state-panel-text">
            En redaktør kigger på det, før det bliver synligt i appen.
          </div>
          <button type="button" className="state-panel-action" onClick={() => navigate('/home')}>
            Til forsiden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-screen">
      <PageHeader title={state.correctionFor ? 'Foreslå rettelse' : 'Tilføj en grav'} />
      <form className="form" onSubmit={onSubmit}>
        <p className="bio-text">
          Vi viser kun personer, der har været døde i mindst 10 år, og som har offentlig interesse.
          Skriv kun, hvad der står på stenen eller i offentlige kilder.
        </p>
        <label>
          Navn på stenen
          <input
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="form-row">
          <label>
            Født (år)
            <input
              inputMode="numeric"
              pattern="[0-9]{3,4}"
              value={birthYear}
              onChange={(e) => setBirthYear(e.target.value)}
            />
          </label>
          <label>
            Død (år)
            <input
              inputMode="numeric"
              pattern="[0-9]{3,4}"
              value={deathYear}
              onChange={(e) => setDeathYear(e.target.value)}
            />
          </label>
        </div>
        <label>
          Kirkegård
          <input
            maxLength={200}
            value={cemetery}
            onChange={(e) => setCemetery(e.target.value)}
            placeholder="Fx Assistens Kirkegård"
          />
        </label>
        <label>
          Noter og kilder
          <textarea
            maxLength={2000}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={useLocationToo}
            onChange={(e) => setUseLocationToo(e.target.checked)}
          />
          Vedhæft min nuværende placering (hjælper os med at finde graven)
        </label>
        {status === 'offline' && (
          <div className="inline-note">
            Appen kører uden server, så bidrag kan ikke sendes endnu.
          </div>
        )}
        {status === 'failed' && (
          <div className="inline-note">Noget gik galt. Prøv igen om lidt.</div>
        )}
        <button type="submit" className="primary-btn" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sender…' : 'Send forslag'}
        </button>
      </form>
    </div>
  );
}
