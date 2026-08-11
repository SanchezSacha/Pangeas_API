const { cleanPlainText, normalizePlaceInput } = require('../../utils/placeSecurity');
const { serializeSubmission } = require('../placeSubmissionController');
const {
    PlaceSubmissionAdminError,
    listAdminPlaceSubmissions,
    getAdminPlaceSubmission,
    moderatePlaceSubmission,
    publishPlaceSubmission
} = require('../../models/admin/placeSubmissionAdminModel');

const ALLOWED_STATUSES = new Set(['pending', 'needs_changes', 'approved', 'rejected', 'cancelled']);
const parseId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};
const respondError = (error, res) => {
    if (!(error instanceof PlaceSubmissionAdminError)) return false;
    res.status(error.status).json({ success: false, code: error.code, message: error.message });
    return true;
};

const list = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const status = cleanPlainText(req.query.status, 30);
    const query = cleanPlainText(req.query.q, 100);
    if (status && !ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({ success: false, message: 'Statut invalide.' });
    }

    try {
        const result = await listAdminPlaceSubmissions({ status: status || null, query, page, limit });
        return res.status(200).json({
            success: true,
            ...result,
            submissions: result.submissions.map(serializeSubmission)
        });
    } catch (error) {
        console.error('Erreur liste admin propositions :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger les propositions.' });
    }
};

const getOne = async (req, res) => {
    const submissionId = parseId(req.params.id);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    try {
        const submission = await getAdminPlaceSubmission(submissionId);
        if (!submission) return res.status(404).json({ success: false, message: 'Proposition introuvable.' });
        return res.status(200).json({ success: true, submission: serializeSubmission(submission) });
    } catch (error) {
        console.error('Erreur detail admin proposition :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger la proposition.' });
    }
};

const moderate = action => async (req, res) => {
    const submissionId = parseId(req.params.id);
    const comment = cleanPlainText(req.body.comment, 2000);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    if (comment.length < 3) {
        return res.status(400).json({ success: false, message: 'Un message explicatif est obligatoire.' });
    }
    try {
        const submission = await moderatePlaceSubmission({
            submissionId,
            adminId: req.session.user.id,
            action,
            comment
        });
        return res.status(200).json({ success: true, submission: serializeSubmission(submission) });
    } catch (error) {
        if (respondError(error, res)) return;
        console.error('Erreur moderation proposition :', error);
        return res.status(500).json({ success: false, message: 'Impossible de moderer cette proposition.' });
    }
};

const publish = async (req, res) => {
    const submissionId = parseId(req.params.id);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    const comment = cleanPlainText(req.body.comment, 2000);
    const placeData = normalizePlaceInput(req.body.place || req.body);

    try {
        const result = await publishPlaceSubmission({
            submissionId,
            adminId: req.session.user.id,
            placeData,
            comment
        });
        return res.status(200).json({
            success: true,
            message: result.alreadyPublished ? 'Ce lieu etait deja publie.' : 'Le lieu a ete publie et les points attribues.',
            ...result
        });
    } catch (error) {
        if (respondError(error, res)) return;
        console.error('Erreur publication proposition :', error);
        return res.status(500).json({ success: false, message: 'Impossible de publier ce lieu.' });
    }
};

module.exports = {
    list,
    getOne,
    requestChanges: moderate('request_changes'),
    reject: moderate('reject'),
    publish
};
