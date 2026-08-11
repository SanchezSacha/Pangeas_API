const { promises: fs } = require('fs');
const { getIdempotencyKey } = require('../utils/idempotency');
const { normalizeSubmissionInput } = require('../utils/placeSecurity');
const {
    PlaceSubmissionError,
    createPlaceSubmission,
    listUserPlaceSubmissions,
    getUserPlaceSubmission,
    resubmitPlaceSubmission,
    cancelPlaceSubmission,
    getRewardPreview,
    getPhotoForViewer
} = require('../models/placeSubmissionModel');
const {
    processSubmissionPhotos,
    deleteSubmissionFiles,
    getPrivatePhotoPath
} = require('../services/placeSubmissionImageService');

const STATUS_MESSAGES = Object.freeze({
    pending: 'Votre proposition est en attente de verification.',
    approved: 'Votre proposition a ete publiee sur Pangeas.',
    rejected: 'Votre proposition a ete refusee.',
    needs_changes: 'Des informations ou des photos doivent etre completees.',
    cancelled: 'Vous avez annule cette proposition.'
});

const parseId = value => {
    const id = Number.parseInt(value, 10);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const validateInput = input => {
    if (input.title.length < 3) return 'Le nom du lieu doit contenir entre 3 et 120 caracteres.';
    if (!input.category) return 'La categorie du lieu est invalide.';
    if (!input.coordinates) return 'La position GPS est invalide.';
    return null;
};

const serializeSubmission = submission => ({
    ...submission,
    statusMessage: submission.adminComment || STATUS_MESSAGES[submission.status],
    photos: submission.photos?.map(photo => ({
        ...photo,
        url: `/api/place-submissions/${submission.id}/photos/${photo.id}`,
        thumbnailUrl: `/api/place-submissions/${submission.id}/photos/${photo.id}?thumbnail=1`
    })) || []
});

const sendModelError = (error, res) => {
    if (!(error instanceof PlaceSubmissionError)) return false;
    res.status(error.status).json({ success: false, code: error.code, message: error.message });
    return true;
};

const rewardPreview = async (req, res) => {
    try {
        return res.status(200).json({
            success: true,
            reward: await getRewardPreview(req.session.user.id),
            message: 'Le montant definitif est calcule lors de la publication du lieu.'
        });
    } catch (error) {
        console.error('Erreur estimation proposition de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible de calculer la recompense.' });
    }
};

const create = async (req, res) => {
    const clientRequestId = getIdempotencyKey(req);
    const input = normalizeSubmissionInput(req.body);
    const validationError = validateInput(input);

    if (!clientRequestId) {
        return res.status(400).json({
            success: false,
            message: 'Un en-tete Idempotency-Key valide est obligatoire.'
        });
    }
    if (validationError) return res.status(400).json({ success: false, message: validationError });
    if (!req.files || req.files.length < 1 || req.files.length > 5) {
        return res.status(400).json({ success: false, message: 'Ajoutez entre 1 et 5 photos du lieu.' });
    }

    let processedPhotos = [];
    try {
        processedPhotos = await processSubmissionPhotos(req.files);
        const result = await createPlaceSubmission({
            userId: req.session.user.id,
            clientRequestId,
            input,
            photos: processedPhotos
        });
        if (!result.created) await deleteSubmissionFiles(processedPhotos);

        const reward = await getRewardPreview(req.session.user.id);
        return res.status(result.created ? 201 : 200).json({
            success: true,
            created: result.created,
            message: result.created ? 'Votre proposition a bien ete envoyee.' : 'Cette proposition avait deja ete recue.',
            submission: serializeSubmission(result.submission),
            reward: {
                ...reward,
                disclaimer: 'Le montant definitif sera calcule si le lieu est publie.'
            }
        });
    } catch (error) {
        await deleteSubmissionFiles(processedPhotos);
        if (error.message === 'INVALID_IMAGE_CONTENT') {
            return res.status(400).json({ success: false, message: 'Une des photos est invalide ou illisible.' });
        }
        if (sendModelError(error, res)) return;
        console.error('Erreur creation proposition de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible d envoyer la proposition.' });
    }
};

const mine = async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    try {
        const result = await listUserPlaceSubmissions(req.session.user.id, { page, limit });
        return res.status(200).json({
            success: true,
            ...result,
            submissions: result.submissions.map(serializeSubmission)
        });
    } catch (error) {
        console.error('Erreur liste propositions de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger vos propositions.' });
    }
};

const getOne = async (req, res) => {
    const submissionId = parseId(req.params.id);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    try {
        const submission = await getUserPlaceSubmission(req.session.user.id, submissionId);
        if (!submission) return res.status(404).json({ success: false, message: 'Proposition introuvable.' });
        return res.status(200).json({ success: true, submission: serializeSubmission(submission) });
    } catch (error) {
        console.error('Erreur detail proposition de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger cette proposition.' });
    }
};

const resubmit = async (req, res) => {
    const submissionId = parseId(req.params.id);
    const input = normalizeSubmissionInput(req.body);
    const validationError = validateInput(input);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    if (validationError) return res.status(400).json({ success: false, message: validationError });

    let processedPhotos = [];
    try {
        if (req.files?.length) processedPhotos = await processSubmissionPhotos(req.files);
        const result = await resubmitPlaceSubmission({
            userId: req.session.user.id,
            submissionId,
            input,
            photos: processedPhotos
        });
        await deleteSubmissionFiles(result.replacedPhotos);
        return res.status(200).json({
            success: true,
            message: 'Votre proposition corrigee a ete renvoyee.',
            submission: serializeSubmission(result.submission)
        });
    } catch (error) {
        await deleteSubmissionFiles(processedPhotos);
        if (error.message === 'INVALID_IMAGE_CONTENT') {
            return res.status(400).json({ success: false, message: 'Une des photos est invalide ou illisible.' });
        }
        if (sendModelError(error, res)) return;
        console.error('Erreur renvoi proposition de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible de renvoyer la proposition.' });
    }
};

const cancel = async (req, res) => {
    const submissionId = parseId(req.params.id);
    if (!submissionId) return res.status(400).json({ success: false, message: 'Proposition invalide.' });
    try {
        await cancelPlaceSubmission(req.session.user.id, submissionId);
        return res.status(200).json({ success: true, message: 'Votre proposition a ete annulee.' });
    } catch (error) {
        if (sendModelError(error, res)) return;
        console.error('Erreur annulation proposition de lieu :', error);
        return res.status(500).json({ success: false, message: 'Impossible d annuler la proposition.' });
    }
};

const photo = async (req, res) => {
    const submissionId = parseId(req.params.id);
    const photoId = parseId(req.params.photoId);
    if (!submissionId || !photoId) return res.status(400).json({ success: false, message: 'Photo invalide.' });

    try {
        const storedPhoto = await getPhotoForViewer({
            submissionId,
            photoId,
            userId: req.session.user.id,
            isAdmin: req.session.user.role === 'admin'
        });
        if (!storedPhoto) return res.status(404).json({ success: false, message: 'Photo introuvable.' });

        const filePath = getPrivatePhotoPath(storedPhoto, req.query.thumbnail === '1');
        await fs.access(filePath);
        res.setHeader('Cache-Control', 'private, max-age=300');
        res.type('image/webp');
        return res.sendFile(filePath);
    } catch (error) {
        if (error.code === 'ENOENT') return res.status(404).json({ success: false, message: 'Photo introuvable.' });
        console.error('Erreur lecture photo proposition :', error);
        return res.status(500).json({ success: false, message: 'Impossible de charger la photo.' });
    }
};

module.exports = { create, mine, getOne, resubmit, cancel, rewardPreview, photo, serializeSubmission };
