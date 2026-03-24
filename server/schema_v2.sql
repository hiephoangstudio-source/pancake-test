-- 2H Studio Dashboard v2 — Schema Additions
-- Run AFTER the base schema.sql from v1

-- Tag classifications for branch/staff/lifecycle/service/location mapping
CREATE TABLE IF NOT EXISTS tag_classifications (
    id SERIAL PRIMARY KEY,
    tag_name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(32) NOT NULL,
    display_name VARCHAR(255),
    color VARCHAR(16),
    sort_order INT DEFAULT 0,
    parent_tag VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tag_class_category ON tag_classifications(category);
CREATE INDEX IF NOT EXISTS idx_tag_class_name ON tag_classifications(tag_name);

-- Seed 50 known tags
INSERT INTO tag_classifications (tag_name, category, display_name, color, sort_order) VALUES
-- Chi nhánh (5)
('HOÀNG CẦU', 'branch', 'CN Hoàng Cầu', '#3B82F6', 1),
('Sài Gòn', 'branch', 'CN Sài Gòn', '#EF4444', 2),
('SƠN TÂY', 'branch', 'CN Sơn Tây', '#10B981', 3),
('NINH HIỆP', 'branch', 'CN Ninh Hiệp', '#F59E0B', 4),
('Long biên', 'branch', 'CN Long Biên', '#8B5CF6', 5),
-- Nhân viên (18)
('HÀ', 'staff', 'Hà', '#6366F1', 10),
('Kim Anh', 'staff', 'Kim Anh', '#EC4899', 11),
('Hằng', 'staff', 'Hằng', '#14B8A6', 12),
('Oanh', 'staff', 'Oanh', '#F97316', 13),
('Hường', 'staff', 'Hường', '#06B6D4', 14),
('Hậu', 'staff', 'Hậu', '#A855F7', 15),
('HẠNH', 'staff', 'Hạnh', '#84CC16', 16),
('hiền', 'staff', 'Hiền', '#EAB308', 17),
('Trang', 'staff', 'Trang', '#F43F5E', 18),
('Quỳnh Anh', 'staff', 'Quỳnh Anh', '#22D3EE', 19),
('HUỆ', 'staff', 'Huệ', '#D946EF', 20),
('Kim Chi', 'staff', 'Kim Chi', '#FB923C', 21),
('Xuyến', 'staff', 'Xuyến', '#2DD4BF', 22),
('Thương', 'staff', 'Thương', '#818CF8', 23),
('Phương Mai', 'staff', 'Phương Mai', '#FB7185', 24),
('Giang', 'staff', 'Giang', '#34D399', 25),
('Hường LB', 'staff', 'Hường (Long Biên)', '#0EA5E9', 26),
('Hà off LB', 'staff', 'Hà off (Long Biên)', '#7C3AED', 27),
-- Lifecycle khách hàng (13)
('KH THAM KHẢO', 'lifecycle', 'Tham khảo', '#94A3B8', 30),
('KH TIỀM NĂNG', 'lifecycle', 'Tiềm năng', '#3B82F6', 31),
('KH HẸN ĐẾN', 'lifecycle', 'Hẹn đến', '#F59E0B', 32),
('KH HẸN ĐÃ ĐẾN', 'lifecycle', 'Đã đến', '#10B981', 33),
('KH KÝ ONLINE', 'lifecycle', 'Ký online', '#22C55E', 34),
('KH KÍ OFFLINE', 'lifecycle', 'Ký offline', '#16A34A', 35),
('KH CHỌN GIÁ RẺ', 'lifecycle', 'Chọn giá rẻ', '#EF4444', 36),
('KH MẤT', 'lifecycle', 'Mất', '#DC2626', 37),
('VÃNG LAI', 'lifecycle', 'Vãng lai', '#9CA3AF', 38),
('khách cũ', 'lifecycle', 'Khách cũ', '#6B7280', 39),
('Khách hội nhóm', 'lifecycle', 'Hội nhóm', '#A78BFA', 40),
('KH kí tháng cũ', 'lifecycle', 'Ký tháng cũ', '#059669', 41),
('SAI ĐỐI TƯỢNG', 'lifecycle', 'Sai đối tượng', '#B91C1C', 42),
-- Dịch vụ (9)
('CHỤP GIA ĐÌNH', 'service', 'Chụp gia đình', '#8B5CF6', 50),
('CHỤP THỜI TRANG', 'service', 'Chụp thời trang', '#EC4899', 51),
('CHỤP STUDIO', 'service', 'Chụp studio', '#3B82F6', 52),
('CHỤP PTRƯỜNG', 'service', 'Chụp phim trường', '#10B981', 53),
('CHỤP COUPLE', 'service', 'Chụp couple', '#F43F5E', 54),
('THUÊ VÁY', 'service', 'Thuê váy', '#D946EF', 55),
('VEST', 'service', 'Vest', '#6366F1', 56),
('THUÊ ÁO DÀI', 'service', 'Thuê áo dài', '#EAB308', 57),
('CHÁP', 'service', 'Lễ tráp', '#F97316', 58),
-- Địa điểm chụp (5)
('CHỤP NBÌNH', 'location', 'Ninh Bình', '#059669', 60),
('CHỤP TAM ĐẢO', 'location', 'Tam Đảo', '#0D9488', 61),
('CHỤP ĐẠI LẢI', 'location', 'Đại Lải', '#0891B2', 62),
('đà lạt', 'location', 'Đà Lạt', '#7C3AED', 63),
('chang tây', 'location', 'Chang Tây', '#4F46E5', 64)
ON CONFLICT (tag_name) DO NOTHING;
