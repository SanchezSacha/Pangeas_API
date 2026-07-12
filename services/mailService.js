const nodemailer = require('nodemailer');

const smtpConfigured = () => (
    process.env.MAIL_HOST &&
    process.env.MAIL_USER &&
    process.env.MAIL_PASSWORD &&
    process.env.MAIL_FROM
);

const createTransporter = () => nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
    if (!smtpConfigured()) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Configuration SMTP manquante.');
        }

        console.log(`Lien de reinitialisation Pangeas pour ${to} : ${resetUrl}`);
        return { skipped: true };
    }

    const transporter = createTransporter();

    return transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Reinitialisation de votre mot de passe Pangeas',
        text: [
            'Bonjour,',
            '',
            'Vous avez demande a reinitialiser votre mot de passe Pangeas.',
            `Cliquez sur ce lien pour choisir un nouveau mot de passe : ${resetUrl}`,
            '',
            'Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, vous pouvez ignorer cet email.'
        ].join('\n'),
        html: `
            <p>Bonjour,</p>
            <p>Vous avez demande a reinitialiser votre mot de passe Pangeas.</p>
            <p><a href="${resetUrl}">Choisir un nouveau mot de passe</a></p>
            <p>Ce lien expire dans 1 heure. Si vous n etes pas a l origine de cette demande, vous pouvez ignorer cet email.</p>
        `
    });
};

module.exports = {
    sendPasswordResetEmail
};
