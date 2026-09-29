/* Tìm Playwright cho các kịch bản e2e: require('playwright') (qua NODE_PATH hoặc node_modules),
   nếu không có thì dùng đường dẫn trong biến môi trường PLAYWRIGHT_MODULE (ví dụ gói driver đi kèm Playwright cho Python:
   PLAYWRIGHT_MODULE=<site-packages>/playwright/driver/package). Không ghi cứng đường dẫn của một máy cụ thể. */
'use strict';
function loadPlaywright() {
  try { return require('playwright'); } catch (e) {
    if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
    throw new Error('Không tìm thấy Playwright. Đặt NODE_PATH tới node_modules có playwright, hoặc PLAYWRIGHT_MODULE tới gói playwright.');
  }
}
module.exports = loadPlaywright();
