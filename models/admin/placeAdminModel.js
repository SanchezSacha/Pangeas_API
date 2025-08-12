const { ObjectId } = require('mongodb');
const { getPlacesCollection } = require('../../BDD/mongo');
const mysql = require('../../BDD/mysql');


const getAllPlaces = async () => {
    const placesCollection = getPlacesCollection();
    return await placesCollection.find({})
        .sort({ category: 1, name: 1 })
        .toArray();
};

const getPlaceById = async (placeId) => {
    const placesCollection = getPlacesCollection();
    return await placesCollection.findOne({ _id: new ObjectId(placeId) });
};

const createPlace = async (placeData) => {
    const placesCollection = getPlacesCollection();
    const result = await placesCollection.insertOne(placeData);
    return result.insertedId;
};

const updatePlace = async (placeId, updatedData) => {
    const placesCollection = getPlacesCollection();
    const result = await placesCollection.updateOne(
        { _id: new ObjectId(placeId) },
        { $set: updatedData }
    );
    return result.modifiedCount > 0;
};

const deletePlace = async (placeId) => {
    const placesCollection = getPlacesCollection();
    const result = await placesCollection.deleteOne({ _id: new ObjectId(placeId) });
    return result.deletedCount > 0;
};

const getPlacesStats = async () => {
    try {
        const placesCollection = getPlacesCollection();
        const totalPlaces = await placesCollection.countDocuments();
        const [visitedRows] = await mysql.promise().query(`
            SELECT place_id
            FROM user_visits
            WHERE status = 'visited'
        `);

        const totalVisited = visitedRows.length;
        if (totalVisited === 0) {
            return {
                totalPlaces,
                totalVisited: 0,
                visitedByCategory: [],
                topVisited: []
            };
        }
        const visitedPlaceIds = visitedRows.map(row => new ObjectId(row.place_id));
        const aggregationResult = await placesCollection.aggregate([
            { $match: { _id: { $in: visitedPlaceIds } } },
            {
                $facet: {
                    visitedByCategory: [
                        { $group: { _id: "$category", count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    topVisited: [
                        {
                            $addFields: {
                                count: {
                                    $literal: null
                                }
                            }
                        },
                        { $project: { name: 1, category: 1 } }
                    ]
                }
            }
        ]).toArray();

        const { visitedByCategory, topVisited } = aggregationResult[0];
        const visitCountMap = {};
        visitedRows.forEach(row => {
            visitCountMap[row.place_id] = (visitCountMap[row.place_id] || 0) + 1;
        });
        const topVisitedWithCounts = topVisited
            .map(place => ({
                placeId: place._id.toString(),
                name: place.name,
                category: place.category,
                count: visitCountMap[place._id.toString()] || 0
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        return {
            totalPlaces,
            totalVisited,
            visitedByCategory,
            topVisited: topVisitedWithCounts
        };
    } catch (error) {
        console.error("Erreur dans getPlacesStats:", error);
        throw error;
    }
};
const getTopVisitedPlaceIds = async (limit = 3) => {
    const query = `
        SELECT place_id, COUNT(*) AS visitCount
        FROM user_visits
        WHERE status = 'visited'
        GROUP BY place_id
        ORDER BY visitCount DESC
        LIMIT ?
    `;
    const [rows] = await mysql.promise().query(query, [limit]);
    return rows;
};

const getPlacesChartCategories = async () => {
    const collection = getPlacesCollection();
    const aggregation = await collection.aggregate([
        {
            $group: {
                _id: "$category",
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]).toArray();

    return {
        labels: aggregation.map(item => item._id),
        values: aggregation.map(item => item.count)
    };
};

const getPlacesChartVisits = async () => {
    const stats = await getPlacesStats();

    return {
        labels: stats.topVisited.map(p => p.name),
        values: stats.topVisited.map(p => p.count)
    };
};

module.exports = {
    getAllPlaces,
    getPlaceById,
    createPlace,
    updatePlace,
    deletePlace,
    getPlacesStats,
    getTopVisitedPlaceIds,
    getPlacesChartCategories,
    getPlacesChartVisits
};
