# RaceWalk Lab

競走動作分析（純前端，無需建置）。匯入影片 → 瀏覽器內 MediaPipe 姿態估計 → 膝伸直、疑似騰空、步頻、軀幹前傾 → 關鍵幀報告與本機訓練紀錄。

執行：`cd racewalk && python3 -m http.server 8080`，開 http://localhost:8080（首次需連網載入模型）。

注意：僅為篩查，非正式裁判判決；步頻／毫秒需勾選「已確認 fps 與慢放倍率」。
