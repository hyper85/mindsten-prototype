import { PERSONS } from '../data/persons';
import { ROUTES } from '../data/routes';
import type { Person, ThemedRoute } from '../types';

const SIMULATED_LATENCY_MS = 150;

function delay<T>(value: T, ms = SIMULATED_LATENCY_MS): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export async function getPersons(): Promise<Person[]> {
  return delay([...PERSONS]);
}

export async function getPersonById(id: number): Promise<Person | null> {
  const person = PERSONS.find((p) => p.id === id);
  return delay(person ?? null);
}

export async function getNearbyPersons(limit = 3): Promise<Person[]> {
  return delay(PERSONS.slice(0, limit));
}

export async function getRoutes(): Promise<ThemedRoute[]> {
  return delay([...ROUTES]);
}

export async function simulateScan(): Promise<Person | null> {
  const [match] = PERSONS;
  return delay(match ?? null, 2200);
}
