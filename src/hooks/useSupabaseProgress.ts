import { supabase } from "@/integrations/supabase/client";
import { StarLevel } from "@/types/word";

const SESSION_KEY = "flashcard-supabase-session";

// Get user_id from URL parameters
export function getUserIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('user_id');
}

interface SessionState {
  selectedPackage: string | null;
  currentIndex: number;
  sessionWordIds: string[];
}

export async function updateWordStarsInSupabase(
  wordId: string,
  stars: StarLevel,
  userId?: string | null
): Promise<void> {
  const uid = userId || getUserIdFromUrl();

  if (!uid) {
    console.error("No user_id available for updating star rating");
    return;
  }

  const { error } = await supabase
    .from("user_word_progress")
    .upsert(
      {
        user_id: uid,
        word_id: wordId,
        star_rating: stars,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,word_id" }
    );

  if (error) {
    console.error("Error updating star rating:", error);
  }
}

export async function addKartXP(xpToAdd: number, userId?: string | null): Promise<void> {
  const uid = userId || getUserIdFromUrl();

  if (!uid) {
    console.error("No user_id available for adding XP");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("kart_xp")
    .eq("user_id", uid)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").insert({ user_id: uid, kart_xp: xpToAdd });
  } else {
    await supabase
      .from("profiles")
      .update({ kart_xp: (profile.kart_xp || 0) + xpToAdd })
      .eq("user_id", uid);
  }
}

/**
 * flashcard_progress tablosunda `current_round_words` Json alanını SessionState olarak kullanıyoruz.
 * (Bu projedeki tablo şemasında selected_package/current_round_words:string[] yok.)
 */
export async function loadProgressFromSupabase(userId: string): Promise<SessionState | null> {
  const { data, error } = await supabase
    .from("flashcard_progress")
    .select("id,current_position,current_round_words")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error loading progress:", error);
    return null;
  }

  if (!data) return null;

  const raw = data.current_round_words as any;

  // New format (object)
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      selectedPackage: raw.selectedPackage ?? null,
      currentIndex: data.current_position ?? 0,
      sessionWordIds: Array.isArray(raw.sessionWordIds) ? raw.sessionWordIds : [],
    };
  }

  // Fallback (array)
  if (Array.isArray(raw)) {
    return {
      selectedPackage: null,
      currentIndex: data.current_position ?? 0,
      sessionWordIds: raw.filter((x) => typeof x === "string"),
    };
  }

  return null;
}

export async function saveProgressToSupabase(userId: string, state: SessionState): Promise<void> {
  const { data: existing } = await supabase
    .from("flashcard_progress")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    current_position: state.currentIndex,
    current_round_words: {
      selectedPackage: state.selectedPackage,
      sessionWordIds: state.sessionWordIds,
    } as any,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    await supabase.from("flashcard_progress").update(payload).eq("id", existing.id);
  } else {
    await supabase
      .from("flashcard_progress")
      .insert({ ...payload, user_id: userId } as any);
  }
}

export async function clearProgressFromSupabase(userId: string): Promise<void> {
  await supabase.from("flashcard_progress").delete().eq("user_id", userId);
}

export function saveSessionState(state: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

export function loadSessionState(): SessionState | null {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearSessionState(): void {
  localStorage.removeItem(SESSION_KEY);
}
