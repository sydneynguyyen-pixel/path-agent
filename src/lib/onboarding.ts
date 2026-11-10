import { DEMO_SIGNUP_CODE, type DirectoryEntry, type UploadRow } from "@/data/scenario";

/** Entries matching the query, with the ones a student can actually pick listed first. */
export function searchDirectory(entries: DirectoryEntry[], query: string) {
  const q = query.trim().toLowerCase();
  const hits = q ? entries.filter((e) => e.name.toLowerCase().includes(q)) : entries;
  return [...hits].sort((a, b) => Number(b.available) - Number(a.available));
}

export function isSignupCode(value: string) {
  return value.trim() === DEMO_SIGNUP_CODE;
}

/** An upload can be accepted once the student has checked every line that wasn't read clearly. */
export function canConfirmUpload(rows: UploadRow[], checked: string[]) {
  return rows.every((r) => !r.unclear || checked.includes(r.id));
}
