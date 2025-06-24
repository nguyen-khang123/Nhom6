const express = require("express");
const app = express();
const path = require("path"); // Để làm việc với đường dẫn file
const mongoose = require('mongoose');
const session = require('express-session');
// Cấu hình EJS làm View Engine và nơi chứa các file EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Cấu hình Express để đọc dữ liệu từ form (req.body)
app.use(express.urlencoded({ extended: true })); // THÊM DÒNG NÀY (quan trọng cho việc nhận dữ liệu từ form POST)
app.use(express.json()); // THÊM DÒNG NÀY (nếu sau này bạn dùng fetch/axios gửi JSON)
app.use(express.static(path.join(__dirname, "public")));
// Cấu hình Session Middleware
app.use(session({
    secret: 'your_secret_key_very_secret_and_long', // Thay đổi chuỗi này thành một chuỗi bí mật mạnh mẽ và độc đáo
    resave: false, // Không lưu lại session nếu không có thay đổi
    saveUninitialized: true, // Lưu session mới chưa được khởi tạo
    cookie: { secure: false } // Đặt true nếu bạn dùng HTTPS
}));
app.use((req, res, next) => {
    // Gán searchQuery từ query param vào res.locals
    // Nếu không có searchQuery, gán chuỗi rỗng
    res.locals.searchQuery = req.query.search || '';
    // Bạn có thể thêm giỏ hàng vào res.locals để hiển thị số lượng item trong header
    res.locals.cart = req.session.cart || [];
    res.locals.cartItemCount = res.locals.cart.reduce((count, item) => count + item.quantity, 0);
    next();
});
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
// Định nghĩa Order Schema và Model (thêm vào sau Product Model)
const orderSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    customerAddress: { type: String, required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        productPrice: { type: Number, required: true },
        quantity: { type: Number, required: true }
    }],
    totalAmount: { type: Number, required: true },
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Pending' } // Pending, Confirmed, Shipped, Delivered, Cancelled
});
const Order = mongoose.model('Order', orderSchema, 'orders'); // Đảm bảo collection name là 'orders'
// KẾT NỐI MONGODB TẠI ĐÂY
mongoose.connect('mongodb://127.0.0.1:27017/DB_ThoiTrangMoVa') // Sử dụng 127.0.0.1 đã được xác nhận
    .then(() => console.log('✅ Kết nối MongoDB cục bộ thành công!'))
    .catch(err => console.error('❌ Lỗi kết nối MongoDB cục bộ:', err));

// Tuyến đường (Route) chính cho trang chủ
app.get("/", async (req, res) => {
    try {
        // Lấy giá trị tìm kiếm từ res.locals
        const query = res.locals.searchQuery;
        let products;

        if (query) {
            // Nếu có từ khóa tìm kiếm
            products = await Product.find({
                name: { $regex: query, $options: 'i' }
            });
            console.log(`Tìm kiếm sản phẩm với từ khóa: "${query}"`);
        } else {
            // Nếu không có từ khóa tìm kiếm, hiển thị tất cả sản phẩm
            products = await Product.find({});
            console.log('Hiển thị tất cả sản phẩm.');
        }
        // Chỉ cần truyền products, searchQuery đã có sẵn qua res.locals
        res.render("index", { products: products });
    } catch (err) {
        console.error('❌ Lỗi khi lấy sản phẩm từ MongoDB:', err);
        res.render("index", { products: [] });
    }
});
// Route cho trang chi tiết sản phẩm
app.get("/san-pham/:id", async (req, res) => {
    try {
        const productId = req.params.id; // Lấy ID sản phẩm từ URL
        const product = await Product.findById(productId); // Tìm sản phẩm trong DB

        if (!product) {
            // Nếu không tìm thấy sản phẩm, chuyển hướng hoặc hiển thị lỗi
            return res.status(404).render("404", { message: "Không tìm thấy sản phẩm." });
        }

        // Lấy sản phẩm gợi ý (ví dụ: 4 sản phẩm ngẫu nhiên không trùng với sản phẩm hiện tại)
        const suggestedProducts = await Product.aggregate([
            { $match: { _id: { $ne: product._id } } }, // Loại trừ sản phẩm đang xem
            { $sample: { size: 4 } } // Lấy 4 sản phẩm ngẫu nhiên
        ]);

        res.render("product-detail", {
            product: product,
            suggestedProducts: suggestedProducts
        });
    } catch (err) {
        console.error('❌ Lỗi khi lấy chi tiết sản phẩm:', err);
        // Nếu lỗi, render trang lỗi hoặc chuyển hướng về trang chủ
        res.status(500).render("error", { message: "Đã xảy ra lỗi khi tải chi tiết sản phẩm." });
    }
});
// router blog
app.get("/blog", (req, res) => {
    res.render("blog"); //blog.ejs
});
// Route hiển thị trang thanh toán
app.get("/thanh-toan", (req, res) => {
    const cart = req.session.cart || [];
    if (cart.length === 0) {
        // Nếu giỏ hàng trống, chuyển hướng về trang giỏ hàng hoặc trang chủ
        return res.redirect('/gio-hang?empty=true');
    }
    let subtotal = 0;
    cart.forEach(item => {
        subtotal += item.productPrice * item.quantity;
    });
    res.render("checkout", {
        cart: cart,
        subtotal: subtotal,
        // Bạn có thể truyền thêm thông tin người dùng nếu đã có session user
        // user: req.session.user || null
    });
});
// Mock data (thay thế bằng dữ liệu thật từ DB hoặc API bên ngoài)
const provincesData = [
    { name: 'Hồ Chí Minh', code: 'HCM' },
    { name: 'Hà Nội', code: 'HN' },
    { name: 'Đà Nẵng', code: 'DN' },
    // Thêm các tỉnh/thành khác
];
const districtsData = {
    'Hồ Chí Minh': [
        { name: 'Quận 1' }, { name: 'Quận 3' }, { name: 'Quận Bình Thạnh' }, { name: 'Thành phố Thủ Đức' }
    ],
    'Hà Nội': [
        { name: 'Quận Ba Đình' }, { name: 'Quận Hoàn Kiếm' }, { name: 'Quận Cầu Giấy' }
    ],
    'Đà Nẵng': [
        { name: 'Quận Hải Châu' }, { name: 'Quận Thanh Khê' }
    ]
    // Thêm các quận/huyện cho từng tỉnh/thành
};
const wardsData = {
    'Quận 1': [{ name: 'Phường Bến Nghé' }, { name: 'Phường Phạm Ngũ Lão' }],
    'Quận Bình Thạnh': [{ name: 'Phường 1' }, { name: 'Phường 2' }],
    'Quận Ba Đình': [{ name: 'Phường Điện Biên' }, { name: 'Phường Thành Công' }]
    // Thêm các phường/xã cho từng quận/huyện
};
app.get('/api/provinces', (req, res) => {
    res.json(provincesData);
});
app.get('/api/districts', (req, res) => {
    const provinceName = req.query.province;
    if (!provinceName) {
        return res.status(400).json({ error: 'Missing province parameter' });
    }
    const districts = districtsData[provinceName] || [];
    res.json(districts);
});
app.get('/api/wards', (req, res) => {
    const districtName = req.query.district;
    if (!districtName) {
        return res.status(400).json({ error: 'Missing district parameter' });
    }
    const wards = wardsData[districtName] || [];
    res.json(wards);
});

// ROUTE ĐỂ LẤY GIỎ HÀNG
app.get('/get-cart', (req, res) => {
    const cart = req.session.cart || [];
    console.log('Backend: /get-cart API called. Cart in session:', cart);
    res.json({ success: true, cart: cart });
});
// ... (các đoạn code khác) ...
// Route mới để áp dụng voucher
// Route để áp dụng voucher
app.post('/apply-voucher', async (req, res) => {
    const { voucherCode, customerEmail, totalAmount } = req.body;
    const discountPercentage = 0.10; // 10% giảm giá
    const expectedVoucherCode = 'MOVA'; // Mã voucher cho lần đầu
    console.log(` Áp dụng voucher: Mã=<span class="math-inline">\{voucherCode\}, Email\=</span>{customerEmail}, Tổng=${totalAmount}`);
    if (voucherCode.toUpperCase() !== expectedVoucherCode) { // Đã sửa thành toUpperCase()
        return res.json({ success: false, message: 'Mã giảm giá không hợp lệ.' });
    }
    if (!customerEmail) {
        return res.json({ success: false, message: 'Vui lòng cung cấp email để kiểm tra voucher.' });
    }
    try {
        // Đảm bảo bạn đã định nghĩa Order model (ví dụ: const Order = require('./models/Order');) ở trên đầu app.js
        // Nếu Order chưa được require, thêm dòng này
        const Order = require('./models/Order');
        const existingOrder = await Order.findOne({ customerEmail: customerEmail });
        if (existingOrder) {
            return res.json({ success: false, message: 'Bạn đã là khách hàng cũ. Voucher này chỉ dành cho khách hàng lần đầu.' });
        } else {
            const discountAmount = totalAmount * discountPercentage;
            // Lưu thông tin voucher vào session để sử dụng ở route /dat-hang
            req.session.appliedVoucher = {
                code: voucherCode.toUpperCase(),
                discountAmount: discountAmount,
                isValid: true
            };
            console.log(` Voucher áp dụng thành công. Giảm giá: ${discountAmount.toLocaleString('vi-VN')} VNĐ.`);
            return res.json({
                success: true,
                message: `Áp dụng mã giảm giá thành công! Bạn được giảm ${discountPercentage * 100}%.`,
                discountAmount: discountAmount
            });
        }
    } catch (error) {
        console.error(' Lỗi khi kiểm tra và áp dụng voucher (Backend):', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi áp dụng voucher. Vui lòng thử lại.' });
    }
});
// Route xử lý việc đặt hàng
app.post('/dat-hang', async (req, res) => {
    try {
        const {
            customerName,
            customerLastName,
            customerEmail,
            customerPhone,
            customerAddress,
            customerProvince,
            customerDistrict,
            customerWard,
            paymentMethod,
            appliedDiscount,
            finalTotalAmount
        } = req.body;

        const cartItems = req.session.cart || []; // Lấy giỏ hàng từ session

        if (cartItems.length === 0) {
            return res.json({ success: false, message: 'Giỏ hàng của bạn đang trống.' });
        }

        // Tạo một mảng mới chỉ chứa các trường cần thiết cho order.items
        const orderItems = cartItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            quantity: item.quantity
        }));

        const newOrder = new Order({
            customerName: `${customerName} ${customerLastName}`, // Kết hợp tên và họ
            customerEmail,
            customerPhone,
            customerAddress: `${customerAddress}, ${customerWard}, ${customerDistrict}, ${customerProvince}`, // Ghép địa chỉ
            items: orderItems,
            totalAmount: finalTotalAmount, // Sử dụng finalTotalAmount đã được giảm giá
            status: 'Pending',
            paymentMethod: paymentMethod, // Lưu phương thức thanh toán
            appliedDiscount: appliedDiscount // Lưu giá trị giảm giá đã áp dụng
        });

        await newOrder.save();
        // Xóa giỏ hàng sau khi đặt hàng thành công
        req.session.cart = [];
        req.session.save(); // Lưu session
        console.log('Đơn hàng mới đã được tạo:', newOrder);

        if (paymentMethod === 'bank_transfer_qr') {
            // Logic tạo QR code và gửi về frontend
            // Ở đây bạn sẽ tạo QR code dựa trên totalAmount và orderId
            // Ví dụ đơn giản:
            const qrCodeUrl = `/images/qr-placeholder.png?amount=${finalTotalAmount}&orderId=${newOrder._id}`; // Thay bằng logic tạo QR thật
            res.json({
                success: true,
                message: 'Đơn hàng đã được tạo. Vui lòng quét mã QR để thanh toán.',
                paymentMethod: 'bank_transfer_qr',
                orderData: {
                    orderId: newOrder._id,
                    totalAmount: finalTotalAmount,
                    qrCodeUrl: qrCodeUrl // Gửi URL QR code về frontend
                }
            });
        } else { // COD
            res.json({
                success: true,
                message: 'Đặt hàng thành công! Đơn hàng sẽ được giao trong thời gian sớm nhất.',
                redirectUrl: '/order-success/' + newOrder._id // Chuyển hướng đến trang xác nhận đơn hàng COD
            });
        }

    } catch (error) {
        console.error('Lỗi khi đặt hàng:', error);
        res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi đặt hàng. Vui lòng thử lại.' });
    }
});
// --- Route mới để xác nhận đơn hàng sau khi thanh toán QR (giả lập) ---
// app.js, trong route app.post("/confirm-qr-payment", ...)
app.post('/confirm-qr-payment', async (req, res) => {
    const { orderId, totalAmount } = req.body;
    try {
        // Thực tế ở đây bạn sẽ kiểm tra trạng thái thanh toán từ cổng thanh toán
        // Giả lập: Cập nhật trạng thái đơn hàng thành 'Paid'
        const order = await Order.findById(orderId);
        if (order) {
            order.status = 'Paid';
            await order.save();
            res.json({ success: true, message: 'Thanh toán đã được xác nhận!', redirectUrl: `/order-success/${orderId}` });
        } else {
            res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
        }
    } catch (error) {
        console.error('Lỗi khi xác nhận thanh toán QR (backend):', error);
        res.status(500).json({ success: false, message: 'Lỗi server khi xác nhận thanh toán.' });
    }
});
// Route để xử lý việc thêm sản phẩm vào giỏ hàng
app.post("/add-to-cart", (req, res) => {
    const { productId, productName, productPrice, productImage } = req.body;
    // Lấy số lượng từ req.body. Nếu không có hoặc không hợp lệ, mặc định là 1
    const quantity = parseInt(req.body.quantity) || 1;

    if (!req.session.cart) {
        req.session.cart = [];
    }

    let cart = req.session.cart;
    let found = false;

    for (let i = 0; i < cart.length; i++) {
        if (cart[i].productId.toString() === productId) {
            cart[i].quantity += quantity; // Cộng thêm số lượng mới
            found = true;
            break;
        }
    }

    if (!found) {
        cart.push({
            productId,
            productName,
            productPrice: parseFloat(productPrice),
            productImage,
            quantity // Sử dụng số lượng đã lấy từ form
        });
    }
    req.session.cart = cart; // Cập nhật session
    res.redirect('/gio-hang'); // Chuyển hướng về trang giỏ hàng sau khi thêm
    // Hoặc bạn có thể chuyển hướng về trang chi tiết sản phẩm với thông báo thành công
    // res.redirect(`/san-pham/${productId}?added=true`);
});
//xac nha don hang
app.get('/order-success/:orderId', async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId); // Lấy đơn hàng từ DB
        if (order) {
            res.render('order-success', { order: order });
        } else {
            res.render('order-success', { order: null, message: 'Không tìm thấy đơn hàng.' });
        }
    } catch (error) {
        console.error('Lỗi khi tải trang xác nhận đơn hàng:', error);
        res.render('order-success', { order: null, message: 'Đã xảy ra lỗi khi tải thông tin đơn hàng.' });
    }
});
// Route để hiển thị trang giỏ hàng
app.get("/gio-hang", (req, res) => {
    // Lấy giỏ hàng từ session
    const cart = req.session.cart || [];
    let subtotal = 0;
    // Tính tổng tiền
    cart.forEach(item => {
        subtotal += item.productPrice * item.quantity;
    });
    // Render trang cart.ejs và truyền dữ liệu giỏ hàng
    res.render("cart", {
        cart: cart,
        subtotal: subtotal,
        // res.locals.searchQuery và res.locals.cartItemCount
        // đã tự động có sẵn do middleware bạn đã thiết lập
    });
});
// Route để cập nhật số lượng sản phẩm trong giỏ hàng
app.post("/update-cart-quantity", (req, res) => {
    const { productId, action } = req.body;
    let cart = req.session.cart || [];
    for (let i = 0; i < cart.length; i++) {
        if (cart[i].productId.toString() === productId) {
            if (action === "increase") {
                cart[i].quantity++;
            } else if (action === "decrease") {
                cart[i].quantity--;
                if (cart[i].quantity <= 0) {
                    // Xóa sản phẩm nếu số lượng về 0 hoặc âm
                    cart.splice(i, 1);
                }
            }
            break;
        }
    }
    req.session.cart = cart; // Cập nhật session
    res.redirect('/gio-hang'); // Chuyển hướng về trang giỏ hàng
});
// Route để xóa sản phẩm khỏi giỏ hàng
app.post("/remove-from-cart", (req, res) => {
    const { productId } = req.body;
    let cart = req.session.cart || [];

    // Lọc ra các sản phẩm không phải là sản phẩm cần xóa
    cart = cart.filter(item => item.productId.toString() !== productId);
    req.session.cart = cart; // Cập nhật session
    res.redirect('/gio-hang'); // Chuyển hướng về trang giỏ hàng
});
// Khởi động máy chủ
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
    console.log(`Thư mục public đang được phục vụ từ: ${path.join(__dirname, "public")}`);
});