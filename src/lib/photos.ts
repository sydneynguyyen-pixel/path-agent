/** Listing photos: a local file in src/assets/explore, or an Unsplash id. */
const localPhotos = import.meta.glob<string>("/src/assets/explore/*.jpg", { eager: true, import: "default", query: "?url" });
export const photoUrl = (id: string, width: number) => localPhotos[`/src/assets/explore/${id}.jpg`] ?? `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;
