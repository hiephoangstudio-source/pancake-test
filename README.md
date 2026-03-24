# 2H Studio Dashboard v2 (Pancake)

Bảng điều khiển phân tích marketing, quản lý chi nhánh và hiệu quả quảng cáo cho 2H Studio.

## Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd pancake-2hstudio

# Cài dependencies
npm install

# Copy env
cp .env.example .env
# Sửa thông tin DB, API, JWT trong .env
```

## Chạy

```bash
# Chạy frontend (dev)
npm run dev

# Chạy backend (terminal khác)
npm run server:dev
```

## Cấu trúc

```
pancake-2hstudio/
├── index.html              ← Layout chính (sidebar + content)
├── login.html              ← Trang đăng nhập
├── src/
│   ├── main.js             ← Router SPA + khởi tạo
│   ├── style.css           ← CSS duy nhất
│   ├── components/         ← sidebar, kpiCard, toast
│   ├── pages/              ← 7 trang: dashboard, branch, staff, channels, customers, orders, settings
│   └── utils/              ← api, auth, format, tagClassifier
├── server/
│   ├── index.js            ← Express server + cron sync
│   ├── db.js               ← PostgreSQL connection
│   ├── schema.sql          ← Schema v1
│   ├── schema_v2.sql       ← Schema mới: tag_classifications
│   ├── routes/             ← API routes
│   ├── services/           ← pancakeSync, etc.
│   ├── middleware/         ← auth JWT
│   └── utils/              ← crypto helpers
└── vite.config.js          ← Vite config + API proxy
```

## Tính năng v2

- **Quản lý theo chi nhánh** (tag-based, không phải page-based)
- **5 chi nhánh**: Hoàng Cầu, Sài Gòn, Sơn Tây, Ninh Hiệp, Long Biên
- **50 tags** phân loại: chi nhánh, nhân viên, lifecycle, dịch vụ, địa điểm
- **Phễu chuyển đổi**: Tham khảo → Tiềm năng → Hẹn đến → Đã đến → Ký
- **Hiệu quả kênh QC**: CPM, CPC, CPL, CPA, ads funnel
- **Chi phí ads**: Gán theo Page (Option A)
- **Sidebar component**: Render 1 lần, không copy-paste
- **SPA navigation**: Tải trang mới không reload
- **Toàn bộ UI tiếng Việt**
