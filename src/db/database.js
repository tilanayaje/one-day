import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  habits:      '@habits',
  completions: '@completions',
  journal:     '@journal',
  gratitude:   '@gratitude',
};

async function load(key) {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

async function save(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function nextId(arr) {
  return arr.length === 0 ? 1 : Math.max(...arr.map(x => x.id)) + 1;
}

// --- Habits ---
export async function getHabits() {
  return (await load(KEYS.habits)) ?? [];
}

export async function addHabit(name, perweek, color = null) {
  const habits = await getHabits();
  const habit = { id: nextId(habits), name, perweek, color };
  await save(KEYS.habits, [...habits, habit]);
  return habit;
}

export async function updateHabit(id, name, perweek, color = null) {
  const habits = await getHabits();
  const updated = habits.map(h => h.id === id ? { ...h, name, perweek, color } : h);
  await save(KEYS.habits, updated);
}

export async function deleteHabit(id) {
  const habits = await getHabits();
  await save(KEYS.habits, habits.filter(h => h.id !== id));
  const completions = (await load(KEYS.completions)) ?? {};
  for (const week of Object.keys(completions)) {
    delete completions[week][id];
  }
  await save(KEYS.completions, completions);
}

export async function reorderHabits(orderedHabits) {
  await save(KEYS.habits, orderedHabits);
}

// --- Completions ---
export async function getCompletionsForWeek(weekKey) {
  const all = (await load(KEYS.completions)) ?? {};
  return all[weekKey] ?? {};
}

export async function getAllCompletions() {
  return (await load(KEYS.completions)) ?? {};
}

export async function toggleCompletion(habitId, weekKey, day, checked) {
  const all = (await load(KEYS.completions)) ?? {};
  if (!all[weekKey]) all[weekKey] = {};
  if (!all[weekKey][habitId]) all[weekKey][habitId] = Array(7).fill(false);
  all[weekKey][habitId][day] = checked;
  await save(KEYS.completions, all);
}

// --- Journal ---
export async function getJournalEntries() {
  const entries = (await load(KEYS.journal)) ?? [];
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addJournalEntry(date, title, body) {
  const entries = (await load(KEYS.journal)) ?? [];
  const entry = { id: nextId(entries), date, title, body };
  await save(KEYS.journal, [...entries, entry]);
  return entry;
}

export async function deleteJournalEntry(id) {
  const entries = (await load(KEYS.journal)) ?? [];
  await save(KEYS.journal, entries.filter(e => e.id !== id));
}

// --- Gratitude ---
export async function getGratitudeEntries() {
  const entries = (await load(KEYS.gratitude)) ?? [];
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addGratitudeEntry(date, body) {
  const entries = (await load(KEYS.gratitude)) ?? [];
  const entry = { id: nextId(entries), date, body };
  await save(KEYS.gratitude, [...entries, entry]);
  return entry;
}