import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://haiendrqdnnnyqyruvxl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SCGT3f744EZ1m6iQBOvr-A_O8kZ1gkS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);