import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../db/supabase';

const CACHE_KEY = 'highlighted_habits';
const PREF_KEY  = 'highlighted_habits';

function getSundayKey() {
  const now = new Date();
  now.setDate(now.getDate() - now.getDay());
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseStored(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.weekKey === getSundayKey()) return new Set(parsed.habitIds);
  } catch {}
  return null;
}

// Fast path — reads only AsyncStorage. Used in Promise.all for instant render.
export async function getHighlightsCache() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return parseStored(raw) ?? new Set();
}

// Supabase-first with AsyncStorage fallback. Updates cache on success.
// Called in background after initial render so cross-device changes sync in.
export async function getHighlights() {
  const currentWeek = getSundayKey();
  try {
    const { data } = await supabase
      .from('preferences')
      .select('value')
      .eq('key', PREF_KEY)
      .maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value);
      if (parsed.weekKey === currentWeek) {
        AsyncStorage.setItem(CACHE_KEY, data.value);
        return new Set(parsed.habitIds);
      }
    }
    AsyncStorage.removeItem(CACHE_KEY);
    return new Set();
  } catch {
    return parseStored(await AsyncStorage.getItem(CACHE_KEY)) ?? new Set();
  }
}

// Takes the caller's current Set so it can be used optimistically without
// a re-read. Persists to both Supabase and AsyncStorage.
export async function toggleHighlight(habitId, currentSet) {
  const currentWeek = getSundayKey();
  const set = new Set(currentSet);
  if (set.has(habitId)) set.delete(habitId);
  else set.add(habitId);

  const payload = JSON.stringify({ habitIds: [...set], weekKey: currentWeek });
  AsyncStorage.setItem(CACHE_KEY, payload);
  try {
    await supabase
      .from('preferences')
      .upsert({ key: PREF_KEY, value: payload }, { onConflict: 'user_id,key' });
  } catch { /* non-critical — cached locally */ }

  return new Set(set);
}
