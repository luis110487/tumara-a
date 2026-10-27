// Older API records may contain Python/JSON null values serialized as text.
export function photoSource(value) {
  if (typeof value !== 'string') return '';
  const source = value.trim();
  if (!source || /^(none|null|undefined)$/i.test(source)) return '';
  if (/^\/(?!\/)/.test(source)) return source;
  try {
    const url = new URL(source);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
export function cleanPhotoFields(profile) {
  return { ...profile, photo_url: photoSource(profile.photo_url), evidence_url_1: photoSource(profile.evidence_url_1), evidence_url_2: photoSource(profile.evidence_url_2) };
}
