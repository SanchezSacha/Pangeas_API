const POINT_RULES = Object.freeze({
    visit: 30,
    firstVisit: 70,
    firstCategoryVisit: 30,
    approvedPlaceSubmission: 150,
    globalMilestones: Object.freeze([
        { threshold: 10, points: 120 },
        { threshold: 25, points: 250 },
        { threshold: 50, points: 500 },
        { threshold: 100, points: 1000 }
    ]),
    categoryMilestones: Object.freeze([
        { threshold: 5, points: 60 },
        { threshold: 10, points: 120 },
        { threshold: 20, points: 250 },
        { threshold: 50, points: 600 }
    ])
});

const buildVisitAward = ({ previousTotalVisits, previousCategoryVisits, category }) => {
    const totalVisits = previousTotalVisits + 1;
    const categoryVisits = previousCategoryVisits + 1;
    const entries = [{
        type: 'visit',
        points: POINT_RULES.visit,
        reason: 'Premiere visite validee de ce lieu'
    }];

    if (totalVisits === 1) {
        entries.push({
            type: 'milestone',
            milestoneKey: 'first_visit',
            points: POINT_RULES.firstVisit,
            reason: 'Bonus de premiere visite Pangeas'
        });
    }

    if (categoryVisits === 1) {
        entries.push({
            type: 'milestone',
            milestoneKey: `category_${category}_first`,
            points: POINT_RULES.firstCategoryVisit,
            reason: `Premiere visite dans la categorie ${category}`
        });
    }

    for (const milestone of POINT_RULES.globalMilestones) {
        if (previousTotalVisits < milestone.threshold && totalVisits >= milestone.threshold) {
            entries.push({
                type: 'milestone',
                milestoneKey: `visits_${milestone.threshold}`,
                points: milestone.points,
                reason: `Palier de ${milestone.threshold} lieux uniques visites`
            });
        }
    }

    for (const milestone of POINT_RULES.categoryMilestones) {
        if (previousCategoryVisits < milestone.threshold && categoryVisits >= milestone.threshold) {
            entries.push({
                type: 'milestone',
                milestoneKey: `category_${category}_${milestone.threshold}`,
                points: milestone.points,
                reason: `Palier de ${milestone.threshold} lieux ${category}`
            });
        }
    }

    return {
        eligible: true,
        totalPoints: entries.reduce((sum, entry) => sum + entry.points, 0),
        totalVisits,
        categoryVisits,
        entries
    };
};

const getNextMilestone = (count, milestones) => {
    const next = milestones.find(milestone => milestone.threshold > count);
    if (!next) return null;

    const previousThreshold = [...milestones]
        .reverse()
        .find(milestone => milestone.threshold <= count)?.threshold || 0;

    return {
        threshold: next.threshold,
        bonusPoints: next.points,
        current: count,
        remaining: next.threshold - count,
        progressPercent: Math.min(100, Math.round(
            ((count - previousThreshold) / (next.threshold - previousThreshold)) * 100
        ))
    };
};

module.exports = { POINT_RULES, buildVisitAward, getNextMilestone };
