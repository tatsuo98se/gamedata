const express = require("express");
const app = express();
// パス指定用モジュール
const path = require("path");

// 8080番ポートで待ちうける
const port = 8081;
app.listen(port, () => {
  console.log("Running at Port " + port + "...");
});

// 静的ファイルのルーティング
app.use(express.static(path.join(__dirname, "public")));

// その他のリクエストに対する404エラー
app.use((req, res) => {
  res.sendStatus(404);
});
