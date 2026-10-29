# 日语学习

本地日语学习应用，包含 N5 学习计划、单词及语法练习、按次数安排复习、学习记录和备份恢复。浏览器开发界面由 React 和 Vite 构建，Android 应用使用 Capacitor。学习数据保存在本地。

## 运行

需要 Node.js 22 和 npm：

```sh
npm ci
npm test
npm run dev
npm run build:no-audio
```

离线语音文件没有包含在源码中。语音构建需要 macOS Kyoko 声音、Python 3 和 ffmpeg；确认语音的适用许可后，运行 `npm run generate:audio` 与 `npm run check:audio`，再运行 `npm run build`。无语音时可运行 `node scripts/check-content.mjs --no-audio` 检查文字内容，但发音和听力功能不可用。

Android 调试构建需要 Android SDK 与 JDK，运行 `npm run android:build`。课程内容尚未经过日语教师全面审校；合成语音没有逐条人工听审。备份包含学习记录，应妥善保管。

## 内容参考

课程编排参考 [JLPT N5 能力说明](https://www.jlpt.jp/e/about/levelsummary.html)和[国际交流基金初级日语教材](https://www.irodori.jpf.go.jp/starter/pdf.html)。语法及发音核对参考[东京外国语大学文法说明](https://www.coelang.tufs.ac.jp/mt/ja/gmod/courses/c02/lesson21/step1/explanation/038.html)、[日语发音说明](https://www.coelang.tufs.ac.jp/mt/ja/pmod/practical/01-10-01.php)、[东京大学 OJAD](https://www.gavo.t.u-tokyo.ac.jp/ojad/eng/pages/home)和[国际交流基金语法说明](https://www.jpf.go.jp/j/project/japanese/teach/tsushin/grammar/201312.html)。

学习计划是教学编排，并非 JLPT 官方词表或考试题目；课程内容尚未逐条经过专业教师审校。

## 许可

本项目原创代码采用 [MIT License](LICENSE)。第三方代码、数据和素材各自适用其原有许可。
