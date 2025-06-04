const express = require("express");
const app = express();
const path = require("path"); // Để làm việc với đường dẫn file
const mongoose = require('mongoose');

// Cấu hình EJS làm View Engine và nơi chứa các file EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// KẾT NỐI MONGODB TẠI ĐÂY
mongoose.connect('mongodb://127.0.0.1:27017/DB_ThoiTrangMoVa') // Sử dụng 127.0.0.1 đã được xác nhận
    .then(() => console.log('✅ Kết nối MongoDB cục bộ thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB cục bộ:', err));
// ĐỊNH NGHĨA SCHEMA VÀ MODEL SẢN PHẨM
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true }, // Đường dẫn ảnh, ví dụ: "/images/product-1.jpg"
    description: String,
    category: String,
    stock: { type: Number, default: 0 }
}, {
    timestamps: true // Tự động thêm createdAt và updatedAt
});
const Product = mongoose.model('Product', productSchema, 'products'); // <-- THÊM THAM SỐ THỨ 3 LÀ TÊN COLLECTION ĐÚNG

// Cấu hình Express để phục vụ các file tĩnh (CSS, JS, ảnh) từ thư mục 'public'
// Mọi thứ trong 'public' sẽ được truy cập trực tiếp từ gốc URL (ví dụ: /css/style.css)
app.use(express.static(path.join(__dirname, "public")));

// Tuyến đường (Route) chính cho trang chủ
app.get("/", async (req, res) => { // <-- THÊM TỪ KHÓA 'async' Ở ĐÂY
    try {
        // Lấy tất cả sản phẩm từ collection 'products'
        // 'Product' là tên Model mà chúng ta đã định nghĩa từ productSchema
        const products = await Product.find({}); // <-- THÊM DÒNG NÀY ĐỂ LẤY DỮ LIỆU
        res.render("index", { products: products }); // <-- TRUYỀN DỮ LIỆU SẢN PHẨM VÀO TEMPLATE
    } catch (err) {
        console.error('❌ Lỗi khi lấy sản phẩm từ MongoDB:', err);
        // Nếu có lỗi, vẫn render trang chủ nhưng truyền một mảng rỗng để không bị lỗi trên giao diện
        res.render("index", { products: [] });
    }
});
// router blog
app.get("/blog", (req, res) => {
    res.render("blog"); //blog.ejs
});
//router checkout
app.get("/thanh-toan", (req, res) => {
    res.render("checkout"); // Render file checkout.ejs
});
// Khởi động máy chủ
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Thư mục public đang được phục vụ từ: ${path.join(__dirname, "public")}`);
});