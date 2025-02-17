
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import FormData from 'form-data';

dotenv.config();

const app = express();
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});

const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/openai/whisper-small';
//ts-ignore
app.post('/api/transcribe', upload.single('audio'), async (req, res): Promise<void> => {
  try {
    if (!req.file?.buffer) {
      res.status(400).json({ 
        text: '', 
        error: 'No audio file provided' 
      });
    }

    const form = new FormData();
    //@ts-ignore
    form.append('audio', req.file.buffer, {
      filename: 'audio.webm',
      contentType: 'audio/webm',
    });

    const response = await fetch(
      HUGGING_FACE_API,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
        },

        body: form
      }
    );

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`);
    }

    const result = await response.json();
    //@ts-ignore
    res.json({ text: result.text });

  } catch (error) {
    console.error('Error processing audio:', error);
    res.status(500).json({ 
      text: '', 
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});