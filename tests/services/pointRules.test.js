const { POINT_RULES, buildVisitAward, getNextMilestone } = require('../../services/pointRules');

describe('pointRules', () => {
    it('attribue les bonus de premiere visite et de premiere categorie', () => {
        const award = buildVisitAward({
            previousTotalVisits: 0,
            previousCategoryVisits: 0,
            category: 'nature'
        });

        expect(award.totalPoints).toBe(130);
        expect(award.entries).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: 'visit', points: 30 }),
            expect.objectContaining({ milestoneKey: 'first_visit', points: 70 }),
            expect.objectContaining({ milestoneKey: 'category_nature_first', points: 30 })
        ]));
    });

    it('attribue simultanement un palier global et un palier de categorie', () => {
        const award = buildVisitAward({
            previousTotalVisits: 9,
            previousCategoryVisits: 4,
            category: 'secret'
        });

        expect(award.totalPoints).toBe(POINT_RULES.visit + 120 + 60);
        expect(award.entries).toEqual(expect.arrayContaining([
            expect.objectContaining({ milestoneKey: 'visits_10' }),
            expect.objectContaining({ milestoneKey: 'category_secret_5' })
        ]));
    });

    it('n attribue aucun palier entre deux seuils', () => {
        const award = buildVisitAward({
            previousTotalVisits: 13,
            previousCategoryVisits: 6,
            category: 'urbain'
        });

        expect(award.totalPoints).toBe(30);
        expect(award.entries).toHaveLength(1);
    });

    it('calcule la progression dans la tranche courante', () => {
        expect(getNextMilestone(15, POINT_RULES.globalMilestones)).toEqual({
            threshold: 25,
            bonusPoints: 250,
            current: 15,
            remaining: 10,
            progressPercent: 33
        });
        expect(getNextMilestone(100, POINT_RULES.globalMilestones)).toBeNull();
    });
});
