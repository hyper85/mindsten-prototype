import { CircleCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { NavBar, Page } from '../components/Layout';
import { EmptyState } from '../components/StatePanel';
import { submitGrave } from '../lib/api';
import { getCurrentPosition } from '../lib/geo';
import { useDocumentTitle } from '../lib/title';

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
  useDocumentTitle('Tilføj en grav');
  const state = (useLocation().state ?? {}) as {
    prefill?: Prefill | null;
    inscription?: string;
    correctionFor?: number;
  };
  const isCorrection = Boolean(state.correctionFor);
  const [name, setName] = useState(state.prefill?.name ?? '');
  const [birthYear, setBirthYear] = useState(
    state.prefill?.birthYear ? String(state.prefill.birthYear) : '',
  );
  const [deathYear, setDeathYear] = useState(
    state.prefill?.deathYear ? String(state.prefill.deathYear) : '',
  );
  const [cemetery, setCemetery] = useState('');
  const [note, setNote] = useState(
    isCorrection
      ? `Rettelse til person #${state.correctionFor}: `
      : state.inscription
        ? `Indskrift: ${state.inscription}`
        : '',
  );
  const [attachLocation, setAttachLocation] = useState(!isCorrection);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'offline' | 'failed'>('idle');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setStatus('sending');
    const coords = attachLocation ? await getCurrentPosition(6000) : null;
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
      <>
        <NavBar />
        <EmptyState
          icon={<CircleCheck color="var(--tint)" />}
          title="Tak for dit bidrag"
          description="En redaktør kigger på det, før det bliver synligt i appen."
          actionLabel="Til forsiden"
          onAction={() => navigate('/home')}
        />
      </>
    );
  }

  return (
    <>
      <NavBar title={isCorrection ? 'Foreslå rettelse' : 'Tilføj en grav'} staticTitle />
      <Page>
        <h1 className="visually-hidden">{isCorrection ? 'Foreslå rettelse' : 'Tilføj en grav'}</h1>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.5, margin: '8px 4px 20px' }}>
          {isCorrection
            ? 'Fortæl os, hvad der er forkert, og gerne hvor du har oplysningen fra.'
            : 'Vi viser personer, der har været døde i mindst 10 år og har offentlig interesse. Skriv det, der står på stenen eller i offentlige kilder.'}
        </p>
        <form className="form" onSubmit={onSubmit}>
          <div className="list">
            <div className="field">
              <label htmlFor="f-name">Navn på stenen</label>
              <input
                id="f-name"
                required
                minLength={2}
                maxLength={200}
                value={name}
                placeholder="Fx Ane Marie Hansen"
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="f-born">Født (år)</label>
                <input
                  id="f-born"
                  inputMode="numeric"
                  pattern="[0-9]{3,4}"
                  placeholder="1850"
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="f-died">Død (år)</label>
                <input
                  id="f-died"
                  inputMode="numeric"
                  pattern="[0-9]{3,4}"
                  placeholder="1920"
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-cemetery">Kirkegård</label>
              <input
                id="f-cemetery"
                maxLength={200}
                value={cemetery}
                placeholder="Fx Assistens Kirkegård"
                onChange={(e) => setCemetery(e.target.value)}
              />
            </div>
          </div>

          <div className="list">
            <div className="field">
              <label htmlFor="f-note">Noter og kilder</label>
              <textarea
                id="f-note"
                maxLength={2000}
                rows={4}
                value={note}
                placeholder="Hvad ved du om personen?"
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="list">
            <label className="toggle-row">
              <span>
                Vedhæft min placering
                <small>Hjælper os med at finde graven</small>
              </span>
              <input
                type="checkbox"
                className="toggle"
                checked={attachLocation}
                onChange={(e) => setAttachLocation(e.target.checked)}
              />
            </label>
          </div>

          {status === 'offline' && (
            <p className="footnote center">
              Appen kører uden server, så bidrag kan ikke sendes endnu.
            </p>
          )}
          {status === 'failed' && (
            <p className="footnote center" style={{ color: 'var(--danger)' }}>
              Noget gik galt. Prøv igen om lidt.
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Sender…' : 'Send forslag'}
          </button>
        </form>
      </Page>
    </>
  );
}
