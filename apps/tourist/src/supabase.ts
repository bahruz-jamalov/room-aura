import { createRoomAuraClient } from "@room-aura/shared";
import { env } from "./env";

export const supabase = createRoomAuraClient(env.supabaseUrl, env.supabasePublishableKey);
