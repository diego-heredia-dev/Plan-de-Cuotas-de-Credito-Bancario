import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://rmvmilxacdtjqafksudq.supabase.co";
const supabaseKey = "sb_publishable_NLQ945gfBCgNYhxJIpkXIA_mmD4oxEG";

export const supabase = createClient(supabaseUrl, supabaseKey);