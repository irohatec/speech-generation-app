// 必要なライブラリをインポートします
const express = require('express');
const path = require('path');
const cors = require('cors'); // ★変更点: corsライブラリをインポート

// expressアプリを初期化します
const app = express();
// サーバーが待ち受けるポート番号を設定します。Renderが指定するポート、またはローカルテスト用に3000番を使います
const PORT = process.env.PORT || 3000;

// ★変更点: 特定のドメインからの通信を許可するCORS設定
// これにより、irohatec.comに置いたHTMLから、このサーバー(Render上)へのアクセスが可能になります。
const corsOptions = {
  origin: 'https://irohatec.com'
};
app.use(cors(corsOptions));


// JSON形式のリクエストボディを解析できるようにします
app.use(express.json());
// 静的ファイル（HTML, CSS, クライアント側JS）を提供するために、カレントディレクトリを静的フォルダとして設定します
app.use(express.static(path.join(__dirname, '')));


// '/api/generate-speech'というURLへのPOSTリクエストを処理するエンドポイントを作成します
app.post('/api/generate-speech', async (req, res) => {
  // 環境変数からAPIキーを取得します。Render上で設定します。
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // APIキーが設定されていない場合はエラーを返します
    return res.status(500).json({ error: 'APIキーがサーバーに設定されていません。' });
  }

  try {
    // クライアントから送られてきたテキストと話者名を取得します
    const { text, speaker } = req.body;
    if (!text || !speaker) {
      return res.status(400).json({ error: 'テキストと話者が必要です。' });
    }

    // Gemini APIのエンドポイントURL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
    
    // Gemini APIに送信するデータ（ペイロード）を作成します
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

    // fetchを使ってGemini APIを呼び出します
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // APIからのレスポンスをJSONとして解析します
    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        // APIがエラーを返した場合、その内容をクライアントに転送します
        console.error('Gemini API Error:', responseData);
        return res.status(apiResponse.status).json({ error: responseData.error.message || 'Gemini APIでエラーが発生しました。' });
    }

    // 成功した場合、APIからのレスポンスをそのままクライアントに返します
    res.json(responseData);

  } catch (error) {
    // サーバー内部でエラーが発生した場合の処理
    console.error('サーバーエラー:', error);
    res.status(500).json({ error: 'サーバー内部でエラーが発生しました。' });
  }
});

// サーバーを指定したポートで起動します
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました。 http://localhost:${PORT}`);
});
