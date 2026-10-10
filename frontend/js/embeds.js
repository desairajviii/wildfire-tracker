// OpenStreetMap embed URL centered on a point, with one marker.
// pad is how far (in degrees) the map shows around the point.
export function osmEmbedUrl({ lon, lat }, pad = 0.5) {
  const bbox = [lon - pad, lat - pad, lon + pad, lat + pad].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}
