import { supabase } from './supabase';

// ── Auth ─────────────────────────────────────────────────

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
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch { return null; }
}

// ── Preferences ──────────────────────────────────────────

export async function getPreference(key) {
  try {
    const { data } = await supabase
      .from('preferences').select('value').eq('key', key).maybeSingle();
    return data?.value ?? null;
  } catch { return null; }
}

export async function setPreference(key, value) {
  try {
    await supabase
      .from('preferences')
      .upsert({ key, value }, { onConflict: 'user_id,key' });
  } catch { /* non-critical, fail silently */ }
}

// ── Habits ───────────────────────────────────────────────

export async function getHabits() {
  try {
    const { data, error } = await supabase
      .from('habits').select('*').order('ord', { ascending: true });
    if (error) throw error;
    return data ?? [];
  } catch { return []; }
}

export async function addHabit(name, perweek, color = null, notes = null) {
  try {
    const { data: existing } = await supabase
      .from('habits').select('ord').order('ord', { ascending: false }).limit(1);
    const ord = existing?.[0]?.ord ?? 0;
    const { data, error } = await supabase
      .from('habits')
      .insert({ name, perweek, color, notes, ord: ord + 1 })
      .select().single();
    if (error) throw error;
    return data;
  } catch (e) {
    throw new Error('Failed to add habit. Check your connection and try again.');
  }
}

export async function updateHabit(id, name, perweek, color = null, notes = null) {
  try {
    const { error } = await supabase
      .from('habits').update({ name, perweek, color, notes }).eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw new Error('Failed to save habit. Check your connection and try again.');
  }
}

export async function deleteHabit(id) {
  try {
    const { error } = await supabase.from('habits').delete().eq('id', id);
    if (error) throw error;
  } catch (e) {
    throw new Error('Failed to delete habit. Check your connection and try again.');
  }
}

export async function reorderHabits(orderedHabits) {
  try {
    await Promise.all(orderedHabits.map((h, i) =>
      supabase.from('habits').update({ ord: i }).eq('id', h.id)
    ));
  } catch { /* reorder failure is non-critical, UI already updated optimistically */ }
}

// ── Completions ──────────────────────────────────────────

export async function getWeekData(weekKey) {
  try {
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
  } catch { return { checks: {}, blocks: {} }; }
}

export async function getAllCompletions() {
  try {
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
  } catch { return { checks: {}, blocked: {} }; }
}

export async function toggleCompletion(habitId, weekKey, day, checked) {
  try {
    const { error } = await supabase
      .from('completions')
      .upsert({ habit_id: habitId, week_key: weekKey, day, checked, blocked: false },
               { onConflict: 'habit_id,week_key,day' });
    if (error) throw error;
  } catch (e) {
    throw new Error('Failed to save. Check your connection.');
  }
}

export async function toggleBlock(habitId, weekKey, day, blocked) {
  try {
    const { error } = await supabase
      .from('completions')
      .upsert({ habit_id: habitId, week_key: weekKey, day, blocked, checked: false },
               { onConflict: 'habit_id,week_key,day' });
    if (error) throw error;
  } catch (e) {
    throw new Error('Failed to save. Check your connection.');
  }
}

// ── Guest ────────────────────────────────────────────────

export async function signInAnonymously() {
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export async function seedDemoData() {
  const demoHabits = [
    { name: 'Go to gym', perweek: 5, color: '#FF6B6B', notes: 'Upper/lower split — rest days are intentional', ord: 0 },
    { name: 'Code for 1 hour', perweek: 6, color: null, notes: 'Projects or LeetCode', ord: 1 },
    { name: 'Morning walk', perweek: 7, color: null, ord: 2 },
    { name: 'Nighttime routine', perweek: 7, color: '#48DBFB', notes: 'Skincare, stretch, read before bed', ord: 3 },
    { name: 'Read 30 pages', perweek: 5, color: null, ord: 4 },
    { name: 'No phone first hour', perweek: 7, color: null, notes: 'Leave it charging in another room', ord: 5 },
  ];

  try {
    const { data: inserted, error } = await supabase
      .from('habits').insert(demoHabits).select();
    if (error || !inserted) return;

    const completions = [];
  const now = new Date();
  now.setDate(now.getDate() - now.getDay());

  // Generate 9 weeks of randomized data per habit
  for (let w = 0; w < 16; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + (w - 15) * 7);
    const wk = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;

    for (const habit of inserted) {
      // Each habit has a base consistency rate — makes data feel realistic per habit
      const baseRate = 0.5 + Math.random() * 0.4; // 50–90% consistency per habit

      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(weekStart);
        dayDate.setDate(dayDate.getDate() + d);
        if (dayDate > new Date()) continue;

        const roll = Math.random();

        if (roll < baseRate * 0.85) {
          // Check
          completions.push({ habit_id: habit.id, week_key: wk, day: d, checked: true, blocked: false });
        } else if (roll < baseRate * 0.85 + 0.08) {
          // Block/skip — ~8% chance
          completions.push({ habit_id: habit.id, week_key: wk, day: d, checked: false, blocked: true });
        }
        // Otherwise miss — no row inserted
      }
    }
  }

  if (completions.length > 0) {
    await supabase.from('completions').insert(completions);
  }
  } catch { /* demo seed failure is non-critical */ }
}