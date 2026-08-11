const { normalizeSubmissionInput } = require('../../utils/placeSecurity');

describe('securite des propositions de lieux', () => {
    test('normalise les champs multipart et supprime le HTML utilisateur', () => {
        expect(normalizeSubmissionInput({
            name: '<b>Ancienne gare</b>',
            category: 'Historique',
            description: '<script>alert(1)</script>Un lieu oublie',
            coordinates: '{"lat":48.5,"lng":2.2}'
        })).toEqual({
            title: 'Ancienne gare',
            category: 'historique',
            description: 'Un lieu oublie',
            coordinates: { lat: 48.5, lng: 2.2 }
        });
    });

    test('refuse les coordonnees hors limites', () => {
        expect(normalizeSubmissionInput({
            name: 'Lieu test',
            category: 'nature',
            lat: '95',
            lng: '2'
        }).coordinates).toBeNull();
    });
});
