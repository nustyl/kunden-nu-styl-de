export type ProfileRole = "admin" | "client";
export type PostFormat = "reel" | "beitrag" | "karussell" | "story";
export type PostStatus =
  | "entwurf"
  | "zur_freigabe"
  | "freigegeben"
  | "aenderung_gewuenscht"
  | "zurueckgestellt"
  | "veroeffentlicht";
export type MediaType = "image" | "video";
export type DateProposalStatus = "offen" | "akzeptiert" | "abgelehnt";

export type RevisionRoundsFormat = "reel" | "beitrag" | "story";

export interface Client {
  id: string;
  name: string;
  logo_url: string | null;
  max_revision_rounds: number | null;
  max_revision_rounds_by_format: Partial<Record<RevisionRoundsFormat, number | null>>;
  archived_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  client_id: string | null;
  full_name: string | null;
  role: ProfileRole;
  created_at: string;
}

export interface Post {
  id: string;
  client_id: string;
  title: string;
  format: PostFormat;
  platforms: string[];
  caption: string;
  hashtags: string;
  publish_date: string | null;
  approval_deadline: string | null;
  status: PostStatus;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
  revision_rounds_used: number;
  revision_rounds_bonus: number;
  proposed_publish_date: string | null;
  proposed_publish_date_by: string | null;
  proposed_publish_date_status: DateProposalStatus | null;
  created_at: string;
  updated_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  r2_key: string;
  type: MediaType;
  mime_type: string;
  size: number | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  categories: string[] | null;
  edited_at: string | null;
  created_at: string;
}

export interface PostWithRelations extends Post {
  post_media: PostMedia[];
  comments: (Comment & { profiles: Pick<Profile, "full_name" | "role"> | null })[];
  clients?: Pick<Client, "id" | "name" | "logo_url">;
}

export const PLATFORMS = ["Instagram", "Facebook", "TikTok", "LinkedIn"] as const;

export const POST_FORMAT_LABELS: Record<PostFormat, string> = {
  reel: "Reel",
  beitrag: "Beitrag",
  karussell: "Karussell",
  story: "Story",
};

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  entwurf: "Entwurf",
  zur_freigabe: "Zur Freigabe",
  freigegeben: "Freigegeben",
  aenderung_gewuenscht: "Änderung gewünscht",
  zurueckgestellt: "Zurückgestellt",
  veroeffentlicht: "Veröffentlicht",
};

// Kategorien für "Änderung gewünscht" — je nach Format unterschiedlich.
export const CHANGE_CATEGORIES_IMAGE = [
  "Design",
  "Inhalt auf Grafik",
  "Caption",
  "Hashtags",
] as const;

export const CHANGE_CATEGORIES_VIDEO = [
  "Schnitt & Bildsprache",
  "Ton & Musik",
  "Text im Video",
  "Caption",
  "Hashtags",
] as const;

export function changeCategoriesFor(format: PostFormat): readonly string[] {
  return format === "reel" ? CHANGE_CATEGORIES_VIDEO : CHANGE_CATEGORIES_IMAGE;
}

export const REVISION_ROUNDS_FORMAT_LABELS: Record<RevisionRoundsFormat, string> = {
  reel: "Reel",
  beitrag: "Beitrag & Karussell",
  story: "Story",
};

// Effektives Änderungsschleifen-Limit für ein Format: eigener Wert, sonst
// der Standardwert des Kunden. "karussell" nutzt den Wert von "beitrag".
export function maxRoundsForFormat(
  client: Pick<Client, "max_revision_rounds" | "max_revision_rounds_by_format">,
  format: PostFormat
): number | null {
  const key: RevisionRoundsFormat = format === "karussell" ? "beitrag" : (format as RevisionRoundsFormat);
  const overrides = client.max_revision_rounds_by_format ?? {};
  if (key in overrides) return overrides[key] ?? null;
  return client.max_revision_rounds;
}

// Reels & Stories sind immer 9:16, Beiträge & Karussells immer 3:4.
// Tailwind braucht die Klassen als vollständige Strings.
export function mediaAspectClass(format: PostFormat): string {
  return format === "reel" || format === "story" ? "aspect-[9/16]" : "aspect-[3/4]";
}

// Änderungswünsche pro Slide: Bei Beiträgen mit mehreren Medien (Carousel)
// gibt es "Allgemein" (Beitrags-weite Punkte) plus je Slide ein eigenes Feld.
export const CHANGE_CATEGORIES_SLIDE_IMAGE = ["Design", "Inhalt auf Grafik"] as const;
export const CHANGE_CATEGORIES_SLIDE_VIDEO = [
  "Schnitt & Bildsprache",
  "Ton & Musik",
  "Text im Video",
] as const;
export const CHANGE_CATEGORIES_GENERAL = ["Caption", "Design", "Hashtags", "Sonstiges"] as const;

export interface ChangeSection {
  key: string;
  label: string;
  categories: readonly string[];
}

export function changeSectionsFor(
  format: PostFormat,
  slides: MediaType[]
): { carousel: boolean; sections: ChangeSection[] } {
  if (slides.length <= 1) {
    return {
      carousel: false,
      sections: [{ key: "single", label: "Änderungswünsche", categories: changeCategoriesFor(format) }],
    };
  }
  return {
    carousel: true,
    sections: [
      { key: "general", label: "Allgemein", categories: CHANGE_CATEGORIES_GENERAL },
      ...slides.map((type, i) => ({
        key: `slide-${i + 1}`,
        label: `Slide ${i + 1}`,
        categories: type === "video" ? CHANGE_CATEGORIES_SLIDE_VIDEO : CHANGE_CATEGORIES_SLIDE_IMAGE,
      })),
    ],
  };
}
