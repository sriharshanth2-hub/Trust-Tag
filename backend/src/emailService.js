const nodemailer = require('nodemailer');

const createTransporter = () => nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const wrapEmail = (body) => `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding-bottom:24px;">
        <span style="background:#4F46E5;border-radius:12px;padding:10px 20px;color:#fff;font-weight:800;font-size:18px;">
          🛡️ TrustTag
        </span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        ${body}
      </td></tr>
      <tr><td align="center" style="padding:24px 0 0;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">
          Automated notification from TrustTag Professional Verification.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

const verifiedTemplate = ({ candidateName, documentName, companyName, verifiedAt, verificationId }) =>
  wrapEmail(`
    <div style="height:6px;background:linear-gradient(90deg,#10B981,#34D399);border-radius:20px 20px 0 0;"></div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">✅</div>
        <h1 style="color:#1E293B;font-size:24px;margin:16px 0 8px;">Document Verified!</h1>
        <p style="color:#64748B;margin:0;">Hi <strong>${candidateName}</strong>, your document has been successfully verified by HR.</p>
      </div>
      <table width="100%" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 12px;font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;">Verification Details</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📄 <strong>Document:</strong> ${documentName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">🏢 <strong>Company:</strong> ${companyName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">🕐 <strong>Verified At:</strong> ${new Date(verifiedAt).toLocaleString('en-IN')}</p>
          <p style="margin:0;font-size:13px;color:#1E293B;">🔑 <strong>Verification ID:</strong> <code style="background:#EEF2FF;color:#6366F1;padding:2px 6px;border-radius:4px;">${verificationId}</code></p>
        </td></tr>
      </table>
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.APP_URL}/verify/${verificationId}"
           style="background:#10B981;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          View Verification Page →
        </a>
      </div>
    </div>
  `);

const rejectedTemplate = ({ candidateName, documentName, companyName, rejectedAt, reason, resubmitUrl }) =>
  wrapEmail(`
    <div style="height:6px;background:linear-gradient(90deg,#EF4444,#F87171);border-radius:20px 20px 0 0;"></div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">❌</div>
        <h1 style="color:#1E293B;font-size:24px;margin:16px 0 8px;">Document Rejected</h1>
        <p style="color:#64748B;margin:0;">Hi <strong>${candidateName}</strong>, your document could not be verified.</p>
      </div>
      <table width="100%" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:16px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📄 <strong>Document:</strong> ${documentName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">🏢 <strong>Company:</strong> ${companyName}</p>
          <p style="margin:0;font-size:13px;color:#1E293B;">🕐 <strong>Reviewed At:</strong> ${new Date(rejectedAt).toLocaleString('en-IN')}</p>
        </td></tr>
      </table>
      <table width="100%" style="background:#FFF5F5;border-radius:12px;border:1px solid #FECACA;margin-bottom:24px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:12px;color:#EF4444;font-weight:700;">⚠️ Reason for Rejection</p>
          <p style="margin:0;font-size:14px;color:#7F1D1D;">${reason || 'Please contact HR for details.'}</p>
        </td></tr>
      </table>
      <div style="text-align:center;">
        <a href="${resubmitUrl}"
           style="background:#6366F1;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Resubmit Document →
        </a>
      </div>
    </div>
  `);

const uploadedToHRTemplate = ({ candidateName, candidateEmail, documentName, documentType, uploadedAt, adminUrl }) =>
  wrapEmail(`
    <div style="height:6px;background:linear-gradient(90deg,#6366F1,#8B5CF6);border-radius:20px 20px 0 0;"></div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">📋</div>
        <h1 style="color:#1E293B;font-size:24px;margin:16px 0 8px;">New Document Pending Review</h1>
        <p style="color:#64748B;margin:0;">A candidate has uploaded a document that requires your verification.</p>
      </div>
      <table width="100%" style="background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:24px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">👤 <strong>Candidate:</strong> ${candidateName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📧 <strong>Email:</strong> ${candidateEmail}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📄 <strong>Document:</strong> ${documentName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">🏷️ <strong>Type:</strong> ${documentType}</p>
          <p style="margin:0;font-size:13px;color:#1E293B;">⏰ <strong>Uploaded:</strong> ${new Date(uploadedAt).toLocaleString('en-IN')}</p>
        </td></tr>
      </table>
      <div style="text-align:center;">
        <a href="${adminUrl}"
           style="background:#6366F1;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Review in Admin Panel →
        </a>
      </div>
    </div>
  `);

const pendingReminderTemplate = ({ candidateName, documentName, uploadedAt, daysPending }) =>
  wrapEmail(`
    <div style="height:6px;background:linear-gradient(90deg,#F59E0B,#FBBF24);border-radius:20px 20px 0 0;"></div>
    <div style="padding:40px;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">⏳</div>
        <h1 style="color:#1E293B;font-size:24px;margin:16px 0 8px;">Your Document is Still Pending</h1>
        <p style="color:#64748B;margin:0;">Hi <strong>${candidateName}</strong>, your document is still awaiting HR review.</p>
      </div>
      <table width="100%" style="background:#FFFBEB;border-radius:12px;border:1px solid #FDE68A;margin-bottom:24px;">
        <tr><td style="padding:20px;">
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📄 <strong>Document:</strong> ${documentName}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#1E293B;">📅 <strong>Submitted:</strong> ${new Date(uploadedAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
          <p style="margin:0;font-size:13px;color:#D97706;">⏱️ <strong>Days Pending:</strong> ${daysPending} days</p>
        </td></tr>
      </table>
      <div style="text-align:center;">
        <a href="${process.env.APP_URL}"
           style="background:#F59E0B;color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px;">
          Check Status on Dashboard →
        </a>
      </div>
    </div>
  `);

async function sendVerifiedEmail(data) {
  return createTransporter().sendMail({
    from: `"TrustTag Verification" <${process.env.GMAIL_USER}>`,
    to: data.candidateEmail,
    subject: `✅ Your document "${data.documentName}" has been verified — TrustTag`,
    html: verifiedTemplate(data),
  });
}

async function sendRejectedEmail(data) {
  return createTransporter().sendMail({
    from: `"TrustTag Verification" <${process.env.GMAIL_USER}>`,
    to: data.candidateEmail,
    subject: `❌ Action Required: "${data.documentName}" was rejected — TrustTag`,
    html: rejectedTemplate(data),
  });
}

async function sendUploadedToHREmail(data) {
  return createTransporter().sendMail({
    from: `"TrustTag System" <${process.env.GMAIL_USER}>`,
    to: process.env.HR_EMAIL,
    subject: `📋 New Document Pending Review: ${data.documentName} — ${data.candidateName}`,
    html: uploadedToHRTemplate(data),
  });
}

async function sendPendingReminderEmail(data) {
  return createTransporter().sendMail({
    from: `"TrustTag Verification" <${process.env.GMAIL_USER}>`,
    to: data.candidateEmail,
    subject: `⏳ Update: "${data.documentName}" is still under review — TrustTag`,
    html: pendingReminderTemplate(data),
  });
}

module.exports = { sendVerifiedEmail, sendRejectedEmail, sendUploadedToHREmail, sendPendingReminderEmail };