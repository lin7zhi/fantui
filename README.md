# fantui

图像反推 / 标签扩写 / H3 视频提示词前端（Next.js 14 + Tailwind + framer-motion）。

## 功能标签页
- 图像反推：批量上传图片，反推出图提示词。
- 标签扩写：从关键词扩写为完整描述，支持剧场模式分幕。
- H3 视频：上传参考图 + 剧情描述，生成 MiniMax H3 结构化视频提示词。

## H3 视频提示词
调用后端 `POST /api/h3/video` 与 `GET /api/h3/modes`（后端仓库 DaBiao 已内置 `h3-prompt-writing` skill）。
- 模式：Ref2VA（参考图生视频，默认）、I2VA、FL2VA、L2VA、T2VA。
- Ref2VA 将上传的每张图按阅读顺序映射为 `<Picture N>`，输出六段：
  `subject_definitions / summary / retention_analysis / detailed_description / overall_soundscape / non_diegetic_music`。

## 开发
- `.env` 设置 `NEXT_PUBLIC_API_URL` 指向后端地址。
- `npm install && npm run dev`（构建 `npm run build`）。
