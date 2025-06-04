document.addEventListener('DOMContentLoaded', () => {
    const sliderContainer = document.querySelector('.slider-container');
    const slides = document.querySelectorAll('.slider-slide');
    const prevBtn = document.querySelector('.slider-nav.prev');
    const nextBtn = document.querySelector('.slider-nav.next');
    const dotsContainer = document.querySelector('.slider-dots');
    const dots = document.querySelectorAll('.slider-dots .dot');

    let currentIndex = 0;
    const slideWidth = slides[0].clientWidth; // Chiều rộng của một slide
    let autoSlideInterval;
    const autoSlideDelay = 5000; // 5 giây

    function updateSlider() {
        sliderContainer.style.transform = `translateX(${-currentIndex * slideWidth}px)`;

        // Cập nhật dấu chấm active
        dots.forEach((dot, index) => {
            dot.classList.remove('active');
            if (index === currentIndex) {
                dot.classList.add('active');
            }
        });
    }

    function goToNextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
    }

    function goToPrevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlider();
    }

    function startAutoSlide() {
        stopAutoSlide(); // Đảm bảo không có interval cũ nào đang chạy
        autoSlideInterval = setInterval(goToNextSlide, autoSlideDelay);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    // Sự kiện click cho nút Prev/Next
    prevBtn.addEventListener('click', () => {
        stopAutoSlide();
        goToPrevSlide();
        startAutoSlide(); // Bắt đầu lại auto-slide sau khi người dùng tương tác
    });

    nextBtn.addEventListener('click', () => {
        stopAutoSlide();
        goToNextSlide();
        startAutoSlide(); // Bắt đầu lại auto-slide sau khi người dùng tương tác
    });

    // Sự kiện click cho các dấu chấm
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopAutoSlide();
            currentIndex = index;
            updateSlider();
            startAutoSlide(); // Bắt đầu lại auto-slide
        });
    });

    // Đảm bảo slider được cập nhật khi cửa sổ thay đổi kích thước
    window.addEventListener('resize', () => {
        // Cần cập nhật lại slideWidth khi kích thước cửa sổ thay đổi
        // Tuy nhiên, việc này phức tạp hơn nếu bạn muốn hoàn hảo
        // Với setup flexbox hiện tại, chỉ cần đảm bảo updateSlider được gọi
        updateSlider(); // Đảm bảo vị trí đúng sau khi resize
    });

    // Khởi tạo slider và bắt đầu auto-slide
    updateSlider();
    startAutoSlide();
});