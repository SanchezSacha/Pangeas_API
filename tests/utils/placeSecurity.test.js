const {
    cleanRichText,
    normalizeCoordinates,
    normalizeImageUrl,
    normalizePlaceInput
} = require('../../utils/placeSecurity');

describe('placeSecurity', () => {
    test('conserve uniquement le HTML de présentation autorisé', () => {
        const result = cleanRichText('<p onclick="alert(1)">Texte <strong>sûr</strong><script>alert(1)</script></p>');
        expect(result).toBe('<p>Texte <strong>sûr</strong></p>');
    });

    test('refuse les URL non HTTPS et accepte les ressources locales', () => {
        expect(normalizeImageUrl('http://example.com/photo.jpg')).toBeNull();
        expect(normalizeImageUrl('/uploads/photo.jpg')).toBe('/uploads/photo.jpg');
        expect(normalizeImageUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    });

    test('valide les limites géographiques', () => {
        expect(normalizeCoordinates({ lat: 48.85, lng: 2.35 })).toEqual({ lat: 48.85, lng: 2.35 });
        expect(normalizeCoordinates({ lat: 91, lng: 2.35 })).toBeNull();
    });

    test('normalise les données administrateur', () => {
        const place = normalizePlaceInput({
            name: '<b>Paris</b>', department: '75', region: 'IDF', category: 'Nature',
            description: '<p>Parc</p>', legend: '<em>Légende</em>', anecdote: 'Info',
            activities: ['Marche'], image_url: 'https://example.com/a.jpg',
            coordinates: { lat: 48.85, lng: 2.35 }, distance_km: '2.4'
        });
        expect(place.name).toBe('Paris');
        expect(place.category).toBe('nature');
        expect(place.distance_km).toBe(2.4);
    });
});
