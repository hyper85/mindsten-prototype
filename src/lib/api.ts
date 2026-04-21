import { PERSONS } from '../data/persons';
import { ROUTES } from '../data/routes';
import {
  mapPerson,
  mapRoute,
  PERSON_SELECT,
  type PersonRow,
  type RouteRow,
} from './mappers';
import { getSupabase } from './supabase';
import type { Person, ThemedRoute } from '../types';

const SIMULATED_LATENCY_MS = 150;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function logSupabaseFallback(op: string, err: unknown): void {
  console.warn(`[api] Supabase ${op} failed, falling back to fixtures.`, err);
}

export async function getPersons(): Promise<Person[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('persons')
      .select(PERSON_SELECT)
      .order('id');
    if (!error && data) {
      return (data as PersonRow[]).map(mapPerson);
    }
    logSupabaseFallback('getPersons', error);
  }
  return delay([...PERSONS]);
}

export async function getPersonById(id: number): Promise<Person | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('persons')
      .select(PERSON_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (!error) {
      return data ? mapPerson(data as PersonRow) : null;
    }
    logSupabaseFallback('getPersonById', error);
  }
  const match = PERSONS.find((p) => p.id === id);
  return delay(match ?? null);
}

export async function getNearbyPersons(limit = 3): Promise<Person[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('persons')
      .select(PERSON_SELECT)
      .order('id')
      .limit(limit);
    if (!error && data) {
      return (data as PersonRow[]).map(mapPerson);
    }
    logSupabaseFallback('getNearbyPersons', error);
  }
  return delay(PERSONS.slice(0, limit));
}

export async function getRoutes(): Promise<ThemedRoute[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('routes').select('*').order('id');
    if (!error && data) {
      return (data as RouteRow[]).map(mapRoute);
    }
    logSupabaseFallback('getRoutes', error);
  }
  return delay([...ROUTES]);
}

export async function simulateScan(): Promise<Person | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('persons')
      .select(PERSON_SELECT)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (!error) {
      return delay(data ? mapPerson(data as PersonRow) : null, 2200);
    }
    logSupabaseFallback('simulateScan', error);
  }
  const [match] = PERSONS;
  return delay(match ?? null, 2200);
}
