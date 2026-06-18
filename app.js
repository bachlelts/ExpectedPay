// Đường dẫn tệp tin dữ liệu CSV gốc lưu trữ tại Repo GitHub của bạn
const locationsCsvUrl = 'locations.csv';
const pricingCsvUrl = 'pricing.csv';

// Biến lưu trữ dữ liệu hệ thống toàn cục
let locationsData = [];
let pricingData = {};

// Khai báo các phần tử UI giao diện (Calculator View)
const locationGroupSelect = document.getElementById('locationGroup');
const locationSelect = document.getElementById('location');
const priorityTierInput = document.getElementById('priorityTier');
const workerInputGroup = document.getElementById('workerInputGroup');
const daysInput = document.getElementById('days');
const workersInput = document.getElementById('workers');
const totalPayDisplay = document.getElementById('totalPay');
const statusDiv = document.getElementById('status');

// Khai báo phần tử UI cho Navigation View
const showCalcBtn = document.getElementById('showCalcBtn');
const showFormBtn = document.getElementById('showFormBtn');
const calculatorView = document.getElementById('calculatorView');
const submissionView = document.getElementById('submissionView');

// Khai báo phần tử UI giao diện (Submission Form View)
const submissionForm = document.getElementById('submissionForm');
const formLocationGroup = document.getElementById('formLocationGroup');
const formLocationDetails = document.getElementById('formLocationDetails');
const formStatus = document.getElementById('formStatus');

// Chạy khởi tạo ứng dụng khi trang web hoàn tất tải cấu trúc DOM
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    setupNavigation();
    setupFormSubmission();
});

// Thêm đoạn này vào cuối hàm setupEventListeners() hiện tại của bạn
const refreshReferralBtn = document.getElementById('refreshReferralBtn');
if (refreshReferralBtn) {
    refreshReferralBtn.addEventListener('click', () => {
        loadReferralData();
    });
    
    // Hiệu ứng hover đổi màu cho nút refresh đồng bộ với CSS biến thể hệ thống
    refreshReferralBtn.addEventListener('mouseover', () => {
        refreshReferralBtn.style.backgroundColor = 'var(--primary-hover)';
    });
    refreshReferralBtn.addEventListener('mouseout', () => {
        refreshReferralBtn.style.backgroundColor = 'var(--primary)';
    });
}

// Điều hướng Single-Page View giữa bộ tính toán và Biểu mẫu đăng ký
function setupNavigation() {
    showCalcBtn.addEventListener('click', () => {
        showCalcBtn.classList.add('active');
        showFormBtn.classList.remove('active');
        calculatorView.classList.remove('hidden');
        submissionView.classList.add('hidden');
    });

    showFormBtn.addEventListener('click', () => {
        showFormBtn.classList.add('active');
        showCalcBtn.classList.remove('active');
        submissionView.classList.remove('hidden');
        calculatorView.classList.add('hidden');
    });
}

// Tải đồng bộ dữ liệu và lập bản đồ bảng giá theo từng mức Priority
function loadData() {
    Promise.all([
        parseCsv(locationsCsvUrl),
        parseCsv(pricingCsvUrl)
    ])
    .then(([locations, pricing]) => {
        locationsData = locations;
        
        // Chuẩn hóa và bản đồ hóa cấu trúc tệp dữ liệu pricing.csv
        pricing.forEach(row => {
            if (row.Priority) {
                pricingData[row.Priority.trim()] = {
                    pricePerLoc: parseFloat(row.PricePerLoc) || 0,
                    pricePerPerson: parseFloat(row.PricePerPerson) || 0
                };
            }
        });

        statusDiv.textContent = "Đã kết nối dữ liệu cấu hình CSV thành công.";
        populateLocationGroups();
    })
    .catch(error => {
        console.error("Lỗi đồng bộ hóa tệp dữ liệu cấu hình CSV:", error);
        statusDiv.textContent = "Không thể tải cấu hình dữ liệu. Vui lòng kiểm tra lại sự tồn tại của locations.csv và pricing.csv.";
        statusDiv.style.color = "#dc2626";
    });
}

// Bộ xử lý chuyển đổi dữ liệu thô CSV bằng thư viện PapaParse
function parseCsv(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

// Trích xuất các Nhóm Địa Điểm duy nhất từ tệp dữ liệu đưa vào các Dropdown
function populateLocationGroups() {
    const groups = [...new Set(locationsData.map(item => item.LocationGroup).filter(Boolean))].sort();
    
    // Đổ dữ liệu vào Dropdown 1 của Máy tính
    locationGroupSelect.innerHTML = '<option value="">-- Chọn nhóm địa điểm --</option>';
    // Đổ dữ liệu vào Dropdown "Nhóm location" của Form đăng ký
    formLocationGroup.innerHTML = '<option value="">-- Chọn nhóm location --</option>';

    groups.forEach(group => {
        const option1 = document.createElement('option');
        option1.value = group;
        option1.textContent = group;
        locationGroupSelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = group;
        option2.textContent = group;
        formLocationGroup.appendChild(option2);
    });
    
    locationGroupSelect.disabled = false;
    formLocationGroup.disabled = false;
}

// Thiết lập các cổng lắng nghe tương tác thay đổi giá trị của người dùng
function setupEventListeners() {
    // Xử lý logic lọc phân tầng (Calculator View): Nhóm Địa Điểm -> Địa Điểm Cụ Thể
    locationGroupSelect.addEventListener('change', (e) => {
        const selectedGroup = e.target.value;
        locationSelect.innerHTML = '<option value="">-- Chọn địa điểm cụ thể --</option>';
        priorityTierInput.value = '';
        
        if (!selectedGroup) {
            locationSelect.disabled = true;
            calculatePay();
            return;
        }

        const filtered = locationsData.filter(item => item.LocationGroup === selectedGroup);
        filtered.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Location;
            option.textContent = item.Location;
            option.dataset.priority = item.Priority;
            locationSelect.appendChild(option);
        });

        locationSelect.disabled = false;
        calculatePay();
    });

    // Xử lý logic lọc phân tầng (Submission Form View): Nhóm location -> Chi tiết
    formLocationGroup.addEventListener('change', (e) => {
        const selectedGroup = e.target.value;
        formLocationDetails.innerHTML = '<option value="">-- Chọn chi tiết địa điểm --</option>';
        
        if (!selectedGroup) {
            formLocationDetails.disabled = true;
            return;
        }

        const filtered = locationsData.filter(item => item.LocationGroup === selectedGroup);
        filtered.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Location;
            option.textContent = item.Location;
            formLocationDetails.appendChild(option);
        });

        formLocationDetails.disabled = false;
    });

    // Cập nhật mức độ ưu tiên Priority tự động khi chọn xong Địa Điểm Cụ Thể (Calculator View)
    locationSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        const priority = selectedOption ? selectedOption.dataset.priority : '';
        priorityTierInput.value = priority || '';
        calculatePay();
    });

    // Ẩn/Hiện trường số lượng nhân sự linh hoạt căn cứ theo Phương Án 1 hoặc 2
    document.querySelectorAll('input[name="rentalCase"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === '2') {
                workerInputGroup.classList.remove('hidden');
            } else {
                workerInputGroup.classList.add('hidden');
            }
            calculatePay();
        });
    });

    daysInput.addEventListener('input', calculatePay);
    workersInput.addEventListener('input', calculatePay);
}

// Trình máy tính xử lý công thức toán học nội bộ
function calculatePay() {
    const priority = priorityTierInput.value;
    const days = parseInt(daysInput.value) || 0;
    const selectedCase = document.querySelector('input[name="rentalCase"]:checked').value;
    
    if (!priority || !pricingData[priority] || days <= 0) {
        totalPayDisplay.textContent = '0 ₫';
        return;
    }

    const pricingTier = pricingData[priority];
    let totalPay = 0;

    if (selectedCase === '1') {
        totalPay = pricingTier.pricePerLoc * days;
    } else if (selectedCase === '2') {
        const workers = parseInt(workersInput.value) || 0;
        totalPay = pricingTier.pricePerPerson * workers * days;
    }

    totalPayDisplay.textContent = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(totalPay);
}

// Global global UI Notification Element Reference
const globalToast = document.getElementById('globalToast');
let toastTimeout;

// Centralized Alert Animation Controller Function
function showToast(message, type = 'loading', duration = 4000) {
    // Clear any pending dismissal timers
    clearTimeout(toastTimeout);
    
    // Set text contents and apply stylistic modifier overrides
    globalToast.textContent = message;
    globalToast.className = `status-toast show ${type}`;
    
    // Persist loading alerts until explicitly closed by data lifecycle completions
    if (type === 'loading') return;
    
    // Auto-dismiss execution branch
    toastTimeout = setTimeout(() => {
        globalToast.classList.remove('show');
    }, duration);
}

function hideToast() {
    globalToast.classList.remove('show');
}

// Modify CSV data initializations hooks inside loadData()
function loadData() {
    showToast("Đang tải dữ liệu cấu hình hệ thống...", "loading");
    
    Promise.all([
        parseCsv(locationsCsvUrl),
        parseCsv(pricingCsvUrl)
    ])
    .then(([locations, pricing]) => {
        locationsData = locations;
        
        pricing.forEach(row => {
            if (row.Priority) {
                pricingData[row.Priority.trim()] = {
                    pricePerLoc: parseFloat(row.PricePerLoc) || 0,
                    pricePerPerson: parseFloat(row.PricePerPerson) || 0
                };
            }
        });

        showToast("Đã kết nối dữ liệu cấu hình thành công!", "success");
        populateLocationGroups();
    })
    .catch(error => {
        console.error("Lỗi đồng bộ hóa dữ liệu cấu hình CSV:", error);
        showToast("Không thể tải cấu hình dữ liệu. Vui lòng kiểm tra lại!", "error", 6000);
    });
}

// Modify your setupFormSubmission event pipeline
function setupFormSubmission() {
    submissionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        showToast("Đang gửi dữ liệu đăng ký khảo sát...", "loading");

        const payload = {
            "ID người giới thiệu": document.getElementById('referrerId').value,
            "Ngày có thể bắt đầu": document.getElementById('startDate').value,
            "Địa chỉ": document.getElementById('address').value,
            "Đầu mối liên lạc": document.getElementById('contactPoint').value,
            "Tỉnh / Thành phố": document.getElementById('city').value,
            "Nhóm location": formLocationGroup.value,
            "Chi tiết": formLocationDetails.value,
            "Số ngày quay PA1": parseInt(document.getElementById('pa1Days').value) || 0,
            "Số người quay": parseInt(document.getElementById('numPeople').value) || 0,
            "Số ngày quay PA2": parseInt(document.getElementById('pa2Days').value) || 0
        };

        const apiUrl = 'https://dataops.work/api/referral-program';

        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) throw new Error('Mạng gặp sự cố phản hồi.');
            return response.json();
        })
        .then(data => {
            showToast("Gửi thông tin đăng ký thành công!", "success");
            submissionForm.reset();
            formLocationDetails.disabled = true;
        })
        .catch(error => {
            console.error('Lỗi khi gửi form:', error);
            showToast("Có lỗi xảy ra khi gửi dữ liệu. Vui lòng kiểm tra lại!", "error");
        });
    });
}





// [BỔ SUNG VÀO KHỐI KHAI BÁO UI] - Đặt cạnh các khai báo phần tử điều hướng cũ
const showReferralBtn = document.getElementById('showReferralBtn');
const referralView = document.getElementById('referralView');
const referralTableBody = document.getElementById('referralTableBody');

// [BỔ SUNG VÀO HÀM setupNavigation()] - Thay thế hàm setupNavigation() cũ của bạn
function setupNavigation() {
    showCalcBtn.addEventListener('click', () => {
        setActiveView(showCalcBtn, calculatorView);
    });

    showFormBtn.addEventListener('click', () => {
        setActiveView(showFormBtn, submissionView);
    });

    showReferralBtn.addEventListener('click', () => {
        setActiveView(showReferralBtn, referralView);
        loadReferralData(); // Tự động gọi API lấy dữ liệu mới khi nhấn tab
    });
}

// Hàm trợ giúp chuyển đổi View mượt mà giữa 3 trang
function setActiveView(activeBtn, activeView) {
    [showCalcBtn, showFormBtn, showReferralBtn].forEach(btn => btn.classList.remove('active'));
    [calculatorView, submissionView, referralView].forEach(view => view.classList.add('hidden'));
    
    activeBtn.classList.add('active');
    activeView.classList.remove('hidden');
}

// [THÊM MỚI HÀM NÀY XUỐNG DƯỚI CÙNG FILE APP.JS]
// Xử lý gọi GET API không tham số và hiển thị dữ liệu lên bảng
function loadReferralData() {
    showToast("Đang tải kết quả giới thiệu...", "loading");
    referralTableBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: #64748b;">Đang tải dữ liệu từ máy chủ...</td></tr>';

    // Thay url này bằng Endpoint GET API thực tế của bạn
    const getApiUrl = 'https://dataops.work/api/referral-program'; 

    fetch(getApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Không thể lấy dữ liệu từ hệ thống.');
        return response.json();
    })
    .then(data => {
        hideToast();
        referralTableBody.innerHTML = ''; // Xóa thông báo trạng thái chờ quay

        if (!data || data.length === 0) {
            referralTableBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: #64748b;">Không có dữ liệu giới thiệu nào.</td></tr>';
            return;
        }

        // Tạo vòng lặp duyệt dữ liệu và dựng các hàng (Row) cho bảng hiển thị
        data.forEach(item => {
            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border)';
            
            // Định dạng số tiền sang VND cho đẹp mắt nếu cần thiết, hoặc giữ nguyên tùy dữ liệu gốc
            const formattedPay = typeof item.Maximum_pay_expected === 'number' 
                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.Maximum_pay_expected)
                : item.Maximum_pay_expected;

            row.innerHTML = `
                <td style="padding: 0.75rem; border: 1px solid var(--border); font-weight: 500;">${item.Referral_ID || ''}</td>
                <td style="padding: 0.75rem; border: 1px solid var(--border);">${item.Count ?? 0}</td>
                <td style="padding: 0.75rem; border: 1px solid var(--border); color: #1d4ed8; font-weight: 600;">${formattedPay || 0}</td>
            `;
            referralTableBody.appendChild(row);
        });
    })
    .catch(error => {
        console.error('Lỗi khi tải dữ liệu kết quả giới thiệu:', error);
        showToast("Có lỗi xảy ra khi lấy dữ liệu kết quả!", "error");
        referralTableBody.innerHTML = '<tr><td colspan="3" style="padding: 1rem; text-align: center; color: #dc2626; font-weight: 500;">Lỗi tải dữ liệu. Vui lòng thử lại sau!</td></tr>';
    });
}
