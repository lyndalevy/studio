/** Photo ideas are known by their Dropbox id ("photo:<id>"), so their assignments survive a rename. */
export const isPhoto = (url: string) => url.startsWith("photo:");
export const photoRef = (url: string) => url.slice("photo:".length);
