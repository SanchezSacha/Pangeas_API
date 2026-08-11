const sanitizeHtml = require('sanitize-html');

const PLACE_CATEGORIES = new Set(['nature', 'urbain', 'historique', 'secret', 'frisson']);
const RICH_TEXT_OPTIONS = Object.freeze({
    allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    disallowedTagsMode: 'discard'
});

const cleanPlainText = (value, maxLength = 255) => sanitizeHtml(String(value ?? ''), {
    allowedTags: [],
    allowedAttributes: {}
}).trim().slice(0, maxLength);

const cleanRichText = (value, maxLength = 5000) => sanitizeHtml(String(value ?? ''), RICH_TEXT_OPTIONS)
    .trim()
    .slice(0, maxLength);

const getAllowedImageHosts = () => new Set(
    String(process.env.PLACE_IMAGE_ALLOWED_HOSTS || '')
        .split(',')
        .map(host => host.trim().toLowerCase())
        .filter(Boolean)
);

const normalizeImageUrl = value => {
    const imageUrl = String(value ?? '').trim();
    if (!imageUrl || imageUrl.length > 2048) return null;

    if (imageUrl.startsWith('/uploads/')) return imageUrl;

    try {
        const parsedUrl = new URL(imageUrl);
        if (parsedUrl.protocol !== 'https:') return null;

        const allowedHosts = getAllowedImageHosts();
        if (allowedHosts.size > 0 && !allowedHosts.has(parsedUrl.hostname.toLowerCase())) return null;

        return parsedUrl.toString();
    } catch {
        return null;
    }
};

const normalizeCoordinates = coordinates => {
    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
    return { lat, lng };
};

const normalizeSubmissionInput = body => {
    let rawCoordinates = body.coordinates;
    if (typeof rawCoordinates === 'string') {
        try {
            rawCoordinates = JSON.parse(rawCoordinates);
        } catch {
            rawCoordinates = null;
        }
    }

    const coordinates = normalizeCoordinates(rawCoordinates || {
        lat: body.lat ?? body.latitude,
        lng: body.lng ?? body.longitude
    });
    const category = cleanPlainText(body.category, 50).toLowerCase();

    return {
        title: cleanPlainText(body.title ?? body.name, 120),
        description: cleanPlainText(body.description, 500) || null,
        category: PLACE_CATEGORIES.has(category) ? category : '',
        coordinates
    };
};

const normalizePlaceInput = body => {
    const category = cleanPlainText(body.category, 50).toLowerCase();
    const distanceKm = Number(body.distance_km);

    return {
        name: cleanPlainText(body.name, 150),
        department: cleanPlainText(body.department, 100),
        region: cleanPlainText(body.region, 100),
        category: PLACE_CATEGORIES.has(category) ? category : '',
        description: cleanRichText(body.description),
        legend: cleanRichText(body.legend),
        anecdote: cleanPlainText(body.anecdote, 3000),
        activities: Array.isArray(body.activities)
            ? body.activities.slice(0, 20).map(activity => cleanPlainText(activity, 150)).filter(Boolean)
            : [],
        image_url: normalizeImageUrl(body.image_url),
        coordinates: normalizeCoordinates(body.coordinates),
        distance_km: Number.isFinite(distanceKm) && distanceKm >= 0 ? distanceKm : null
    };
};

const sanitizePlaceOutput = place => {
    if (!place) return place;
    const sanitized = {
        ...place,
        name: cleanPlainText(place.name, 150),
        department: cleanPlainText(place.department, 100),
        region: cleanPlainText(place.region, 100),
        category: cleanPlainText(place.category, 50),
        description: cleanRichText(place.description),
        legend: cleanRichText(place.legend),
        anecdote: cleanPlainText(place.anecdote, 3000),
        activities: Array.isArray(place.activities)
            ? place.activities.map(activity => cleanPlainText(activity, 150)).filter(Boolean)
            : [],
        image_url: normalizeImageUrl(place.image_url),
        images: Array.isArray(place.images)
            ? place.images.slice(0, 20).map(normalizeImageUrl).filter(Boolean)
            : undefined
    };
    delete sanitized.submission_id;
    delete sanitized.is_published;
    return sanitized;
};

module.exports = {
    cleanPlainText,
    cleanRichText,
    normalizeCoordinates,
    normalizeSubmissionInput,
    normalizeImageUrl,
    normalizePlaceInput,
    sanitizePlaceOutput
};
