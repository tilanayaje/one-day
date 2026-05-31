import { supabase } from './supabase';

// --- Auth ---
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// --- Habits ---
export async function getHabits() {
  const { data, error } = await supabase
    .from('habits').select('*').order('ord', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addHabit(name, perweek, color = null, notes = null) {
  const { data: existing } = await supabase
    .from('habits').select('ord').order('ord', { ascending: false }).limit(1);
  const ord = existing?.[0]?.ord ?? 0;
  const { data, error } = await supabase
    .from('habits')
    .insert({ name, perweek, color, notes, ord: ord + 1 })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateHabit(id, name, perweek, color = null, notes = null) {
  const { error } = await supabase
    .from('habits').update({ name, perweek, color, notes }).eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id) {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderHabits(orderedHabits) {
  await Promise.all(orderedHabits.map((h, i) =>
    supabase.from('habits').update({ ord: i }).eq('id', h.id)
  ));
}

// --- Completions ---

// Used by HabitTable — returns both checked and blocked arrays
export async function getWeekData(weekKey) {
  const { data, error } = await supabase
    .from('completions').select('*').eq('week_key', weekKey);
  if (error) throw error;
  const checks = {};
  const blocks = {};
  for (const row of data) {
    if (!checks[row.habit_id]) checks[row.habit_id] = Array(7).fill(false);
    if (!blocks[row.habit_id]) blocks[row.habit_id] = Array(7).fill(false);
    checks[row.habit_id][row.day] = row.checked;
    blocks[row.habit_id][row.day] = row.blocked ?? false;
  }
  return { checks, blocks };
}

// Used by Analytics / You — blocked days count as unchecked
export async function getCompletionsForWeek(weekKey) {
  const { data, error } = await supabase
    .from('completions').select('*').eq('week_key', weekKey);
  if (error) throw error;
  const result = {};
  for (const row of data) {
    if (!result[row.habit_id]) result[row.habit_id] = Array(7).fill(false);
    result[row.habit_id][row.day] = row.checked && !(row.blocked ?? false);
  }
  return result;
}

// Used by Analytics / You — blocked days excluded from counts
export async function getAllCompletions() {
  const { data, error } = await supabase.from('completions').select('*');
  if (error) throw error;
  const result = {};
  const blocked = {};
  for (const row of data) {
    if (!result[row.week_key]) result[row.week_key] = {};
    if (!blocked[row.week_key]) blocked[row.week_key] = {};
    if (!result[row.week_key][row.habit_id]) result[row.week_key][row.habit_id] = Array(7).fill(false);
    if (!blocked[row.week_key][row.habit_id]) blocked[row.week_key][row.habit_id] = Array(7).fill(false);
    result[row.week_key][row.habit_id][row.day] = row.checked && !(row.blocked ?? false);
    blocked[row.week_key][row.habit_id][row.day] = row.blocked ?? false;
  }
  return { checks: result, blocked };
}

export async function toggleCompletion(habitId, weekKey, day, checked) {
  const { error } = await supabase
    .from('completions')
    .upsert({ habit_id: habitId, week_key: weekKey, day, checked, blocked: false },
             { onConflict: 'habit_id,week_key,day' });
  if (error) throw error;
}

export async function toggleBlock(habitId, weekKey, day, blocked) {
  const { error } = await supabase
    .from('completions')
    .upsert({ habit_id: habitId, week_key: weekKey, day, blocked, checked: false },
             { onConflict: 'habit_id,week_key,day' });
  if (error) throw error;
}

// --- Journal ---
export async function getJournalEntries() {
  const { data, error } = await supabase
    .from('journal_entries').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addJournalEntry(date, title, body) {
  const { data, error } = await supabase
    .from('journal_entries').insert({ date, title, body }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id) {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id);
  if (error) throw error;
}

// --- Gratitude ---
export async function getGratitudeEntries() {
  const { data, error } = await supabase
    .from('gratitude_entries').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addGratitudeEntry(date, body) {
  const { data, error } = await supabase
    .from('gratitude_entries').insert({ date, body }).select().single();
  if (error) throw error;
  return data;
}

export async function updateJournalEntry(id, title, body) {
  const { error } = await supabase
    .from('journal_entries').update({ title, body }).eq('id', id);
  if (error) throw error;
}