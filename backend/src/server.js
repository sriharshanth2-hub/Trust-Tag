require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  sendVerifiedEmail, sendRejectedEmail,
  sendUploadedToHREmail, sendPendingReminderEmail,
} = require('./emailService');
const supabase = require('./supabaseClient');

const app = express();
app.use(cors());
app.use(express.json());

// Upload → alerts HR
app.post('/api/documents/upload', async (req, res) => {
  const { candidateName, candidateEmail, documentName, documentType, companyName } = req.body;

  if (!candidateName || !candidateEmail || !documentName)
    return res.status(400).json({ success: false, message: 'Required fields missing' });

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      candidate_name:  candidateName,
      candidate_email: candidateEmail,
      document_name:   documentName,
      document_type:   documentType || 'General Document',
      company_name:    companyName  || 'N/A',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });

  try {
    await sendUploadedToHREmail({
      candidateName, candidateEmail, documentName,
      documentType: doc.document_type,
      uploadedAt: doc.uploaded_at,
      adminUrl: `${process.env.APP_URL}/admin`,
    });
  } catch (err) { console.error('[EMAIL ERROR]', err.message); }

  res.json({ success: true, documentId: doc.id });
});

// List documents
app.get('/api/admin/documents', async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('documents').select('*').order('uploaded_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: error.message });
  res.json({ documents: data, total: data.length });
});

// Approve or reject
app.patch('/api/admin/documents/:id/review', async (req, res) => {
  const { action, reason } = req.body;

  const { data: doc, error } = await supabase
    .from('documents')
    .update({
      status:           action === 'approve' ? 'verified' : 'rejected',
      reviewed_at:      new Date().toISOString(),
      rejection_reason: action === 'reject' ? reason : null,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !doc) return res.status(404).json({ message: 'Document not found' });

  const verificationId = `TT-${req.params.id}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

  try {
    if (action === 'approve') {
      await sendVerifiedEmail({
        candidateName: doc.candidate_name, candidateEmail: doc.candidate_email,
        documentName: doc.document_name, companyName: doc.company_name,
        verifiedAt: doc.reviewed_at, verificationId,
      });
    } else {
      await sendRejectedEmail({
        candidateName: doc.candidate_name, candidateEmail: doc.candidate_email,
        documentName: doc.document_name, companyName: doc.company_name,
        rejectedAt: doc.reviewed_at,
        reason: reason || 'No reason provided.',
        resubmitUrl: `${process.env.APP_URL}/upload`,
      });
    }
  } catch (err) { console.error('[EMAIL ERROR]', err.message); }

  res.json({ success: true, document: doc, verificationId });
});

// Stats
app.get('/api/admin/stats', async (req, res) => {
  const { data } = await supabase.from('documents').select('status');
  const docs = data || [];
  res.json({
    documents: {
      total:    docs.length,
      pending:  docs.filter(d => d.status === 'pending').length,
      verified: docs.filter(d => d.status === 'verified').length,
      rejected: docs.filter(d => d.status === 'rejected').length,
    }
  });
});

// Reminder scheduler
const REMINDER_AFTER_DAYS = parseInt(process.env.REMINDER_AFTER_DAYS || '2');
const CHECK_INTERVAL_MS   = parseInt(process.env.REMINDER_INTERVAL_MS || '3600000');

async function runPendingReminders() {
  const cutoff = new Date(Date.now() - REMINDER_AFTER_DAYS * 86_400_000).toISOString();
  const { data: pending } = await supabase
    .from('documents').select('*')
    .eq('status', 'pending').lt('uploaded_at', cutoff).lt('reminders_sent', 3);

  for (const doc of pending || []) {
    const hoursSinceLast = doc.last_reminder_at
      ? (Date.now() - new Date(doc.last_reminder_at).getTime()) / 3_600_000
      : Infinity;
    if (hoursSinceLast < 24) continue;

    const daysPending = Math.floor((Date.now() - new Date(doc.uploaded_at).getTime()) / 86_400_000);
    try {
      await sendPendingReminderEmail({
        candidateName: doc.candidate_name, candidateEmail: doc.candidate_email,
        documentName: doc.document_name, uploadedAt: doc.uploaded_at, daysPending,
      });
      await supabase.from('documents').update({
        reminders_sent: doc.reminders_sent + 1,
        last_reminder_at: new Date().toISOString(),
      }).eq('id', doc.id);
    } catch (err) { console.error('[REMINDER ERROR]', err.message); }
  }
}
setInterval(runPendingReminders, CHECK_INTERVAL_MS);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 TrustTag API → http://localhost:${PORT}`);
  console.log(`📧 Gmail: ${process.env.GMAIL_USER || '⚠️ not set'}`);
  console.log(`📬 HR Email: ${process.env.HR_EMAIL || '⚠️ not set'}\n`);
});