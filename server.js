// 必要なライブラリをインポートします
const express = require('express');
const cors = require('cors');

// expressアプリを初期化します
const app = express();
const PORT = process.env.PORT || 3000;

// 特定のドメインからの通信を許可するCORS設定
const corsOptions = {
  origin: ['https://irohatec.com', 'http://localhost:3000'] // ローカルテスト用も許可
};
app.use(cors(corsOptions));
app.use(express.json());

// APIキーの存在チェック
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("エラー: 環境変数 GEMINI_API_KEY が設定されていません。");
}

// === APIエンドポイント ===

// 1. テキスト翻訳API
app.post('/api/translate', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'APIキーがサーバーに設定されていません。' });
  }

  try {
    const { text, sourceLang, targetLang } = req.body;
    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'テキスト、翻訳元言語、翻訳先言語が必要です。' });
    }
    
    // もし翻訳元と翻訳先が同じ言語なら、APIを呼ばずにそのままテキストを返す
    if (sourceLang === targetLang) {
      return res.json({ translatedText: text });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;
    
    // Geminiに送るプロンプトを作成
    const prompt = `Translate the following text from ${sourceLang} to ${targetLang}: ${text}`;
    
    const payload = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok || !responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error('Gemini翻訳APIエラー:', responseData);
      return res.status(500).json({ error: '翻訳に失敗しました。' });
    }

    const translatedText = responseData.candidates[0].content.parts[0].text;
    res.json({ translatedText: translatedText.trim() });

  } catch (error) {
    console.error('サーバーエラー (翻訳):', error);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});


// 2. 音声生成API (既存)
app.post('/api/generate-speech', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: 'APIキーがサーバーに設定されていません。' });
  }

  try {
    const { text, speaker } = req.body;
    if (!text || !speaker) {
      return res.status(400).json({ error: 'テキストと話者が必要です。' });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;
    
    const payload = {
      model: "gemini-2.5-flash-preview-tts",
      contents: [{
        parts: [{ text: text }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: speaker }
          }
        }
      }
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        console.error('Gemini音声APIエラー:', responseData);
        return res.status(apiResponse.status).json({ error: responseData.error?.message || 'Gemini APIでエラーが発生しました。' });
    }

    res.json(responseData);

  } catch (error) {
    console.error('サーバーエラー (音声生成):', error);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});


// サーバーを起動
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました。`);
});
