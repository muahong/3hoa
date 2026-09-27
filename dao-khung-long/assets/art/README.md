# Hình vẽ Đảo Khủng Long

Hình gốc (PNG, 1024 hoặc 1254 px cho nhân vật nền trong suốt, 1536 × 1024 cho cảnh nền) tạo ngày 2026-09-27 bằng công cụ tạo ảnh tích hợp của Codex CLI (`codex exec`, model `gpt-5.6-sol`). Prompt chính xác của từng hình nằm trong các tệp `MANIFEST-*.md`; bộ quy tắc phong cách dùng chung và prompt từng lượt chạy nằm trong `prompts/`.

Khi cần vẽ thêm, ghép `prompts/style.txt` với danh sách hình mới rồi chạy từ thư mục này:

```bash
codex exec --skip-git-repo-check -s workspace-write -m gpt-5.6-sol -c model_reasoning_effort="medium" -i rex-adult.png -
```

(`-i rex-adult.png` để giữ đúng dáng Rex khi hình mới có Rex, `-i may-adult.png` khi có Mây. Lượt `may-extra` ngày 2026-09-27 vẽ thêm xe đua, ăn quả mọng, cổ vũ và gợi ý cho Mây: `prompts/run8-may-extra.txt`, `MANIFEST-may-extra.md`.)

| Nhóm | Tệp |
|---|---|
| Rex (Dũng Mãnh) | `rex-egg`, `rex-hatchling`, `rex-kid`, `rex-teen`, `rex-adult`, `rex-legend`, `rex-eating`, `rex-cheer`, `rex-think`, `car-rex` |
| Mây (Dễ Thương) | `may-egg`, `may-hatchling`, `may-kid`, `may-teen`, `may-adult`, `may-legend`, `may-eating`, `may-cheer`, `may-think`, `car-may` |
| 10 loài theo vùng | `sp-rong-bien`, `sp-khung-long-lua`, `sp-giap-long`, `sp-toc-long`, `sp-kiem-long`, `sp-duc-long`, `sp-tam-giac-long`, `sp-long-co-dai`, `sp-mo-vit-long`, `sp-gai-long` |
| Cảnh nền | `bg-island-map`, `bg-race-track`, `bg-meadow`, `bg-garden`, `bg-desert-pyramid`, `bg-market`, `bg-workshop`, `bg-circus-night`, `bg-dusk-sky` |
| Biểu tượng | `berry` (quả mọng) |

Bản gốc nặng khoảng 48 MB, không được game dùng trực tiếp và không đưa lên git (xem `.gitignore`); chỉ có prompt, MANIFEST và README ở đây được commit. Game dùng bản WebP trong `../img/` (nhân vật cắt sát viền, tối đa 560 px; quả mọng 160 px; cảnh nền 1280 px; tổng khoảng 2,2 MB) và biểu tượng PWA trong `../../icons/`, xuất lại bằng lệnh sau ở gốc repo:

```bash
python scripts/dkl-images.py
```
