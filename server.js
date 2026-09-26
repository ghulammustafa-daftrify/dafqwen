const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Document Intake API
app.post('/api/intake', (req, res) => {
  try {
    const { name, email, documents, issue, website, attachment } = req.body || {};

    // Honeypot check (bots fill this, real visitors do not)
    if (website && String(website).trim().length > 0) {
      return res.json({ ok: true });
    }

    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanDocs = String(documents || '').trim();
    const cleanIssue = String(issue || '').trim();

    if (cleanName.length < 2) {
      return res.status(400).json({ ok: false, error: 'Please add your name.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ ok: false, error: 'Please provide a valid email address.' });
    }
    if (cleanDocs.length < 2) {
      return res.status(400).json({ ok: false, error: 'Please describe the document set.' });
    }

    const receivedAt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date());

    console.log('[DAFTRIFY INTAKE RECEIVED]', {
      name: cleanName,
      email: cleanEmail,
      documents: cleanDocs,
      issue: cleanIssue,
      attachedFile: attachment ? `${attachment.name} (${Math.round((attachment.size || 0) / 1024)} KB)` : 'None',
      destination: 'daftrify.services@gmail.com',
      receivedAt: `${receivedAt} PKT`,
    });

    return res.json({
      ok: true,
      messageId: `intake_${Date.now()}`,
      message: 'Your intake details were received successfully.',
    });
  } catch (error) {
    console.error('Error handling intake:', error);
    return res.status(500).json({ ok: false, error: 'Unable to process intake at this time.' });
  }
});

// Serve static assets from public/ and root directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname, { extensions: ['html'] }));

// Catch-all handler to serve index.html (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Daftrify server running on http://0.0.0.0:${PORT}`);
});
