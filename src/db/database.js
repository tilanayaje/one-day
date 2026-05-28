import { supabase } from './supabase';

// --- Auth ---
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
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
    .from('habits')
    .select('*')
    .order('ord', { ascending: true });
  if (error) throw error;
  return data.map(h => ({ ...h, perweek: h.perweek }));
}

export async function addHabit(name, perweek, color = null) {
  const { data: existing } = await supabase.from('habits').select('ord').order('ord', { ascending: false }).limit(1);
  const ord = existing?.[0]?.ord ?? 0;
  const { data, error } = await supabase
    .from('habits')
    .insert({ name, perweek, color, ord: ord + 1 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateHabit(id, name, perweek, color = null) {
  const { error } = await supabase
    .from('habits')
    .update({ name, perweek, color })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteHabit(id) {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderHabits(orderedHabits) {
  const updates = orderedHabits.map((h, i) =>
    supabase.from('habits').update({ ord: i }).eq('id', h.id)
  );
  await Promise.all(updates);
}

// --- Completions ---
export async function getCompletionsForWeek(weekKey) {
  const { data, error } = await supabase
    .from('completions')
    .select('*')
    .eq('week_key', weekKey);
  if (error) throw error;

  const result = {};
  for (const row of data) {
    if (!result[row.habit_id]) result[row.habit_id] = Array(7).fill(false);
    result[row.habit_id][row.day] = row.checked;
  }
  return result;
}

export async function getAllCompletions() {
  const { data, error } = await supabase.from('completions').select('*');
  if (error) throw error;

  const result = {};
  for (const row of data) {
    if (!result[row.week_key]) result[row.week_key] = {};
    if (!result[row.week_key][row.habit_id]) result[row.week_key][row.habit_id] = Array(7).fill(false);
    result[row.week_key][row.habit_id][row.day] = row.checked;
  }
  return result;
}

export async function toggleCompletion(habitId, weekKey, day, checked) {
  const { error } = await supabase
    .from('completions')
    .upsert({ habit_id: habitId, week_key: weekKey, day, checked },
             { onConflict: 'habit_id,week_key,day' });
  if (error) throw error;
}

// --- Journal ---
export async function getJournalEntries() {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addJournalEntry(date, title, body) {
  const { data, error } = await supabase
    .from('journal_entries')
    .insert({ date, title, body })
    .select()
    .single();
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
    .from('gratitude_entries')
    .select('*')
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addGratitudeEntry(date, body) {
  const { data, error } = await supabase
    .from('gratitude_entries')
    .insert({ date, body })
    .select()
    .single();
  if (error) throw error;
  return data;
}