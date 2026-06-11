// Đường dẫn tệp tin dữ liệu CSV gốc lưu trữ tại Repo GitHub của bạn
const locationsCsvUrl = 'locations.csv';
const pricingCsvUrl = 'pricing.csv';

// Biến lưu trữ dữ liệu hệ thống toàn cục
let locationsData = [];
let pricingData = {};

// Khai báo các phần tử UI giao diện
const locationGroupSelect = document.getElementById('locationGroup');
const locationSelect = document.getElementById('location');
const priorityTierInput = document.getElementById('priorityTier');
const workerInputGroup = document.getElementById('workerInputGroup');
const daysInput = document.getElementById('days');
const workersInput = document.getElementById('workers');
const totalPayDisplay = document.getElementById('totalPay');
const statusDiv = document.getElementById('status');

// Chạy khởi tạo ứng dụng khi trang web hoàn tất tải cấu trúc DOM
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

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

// Trích xuất các Nhóm Địa Điểm duy nhất từ tệp dữ liệu đưa vào Dropdown 1
function populateLocationGroups() {
    const groups = [...new Set(locationsData.map(item => item.LocationGroup).filter(Boolean))].sort();
    
    locationGroupSelect.innerHTML = '<option value="">-- Chọn nhóm địa điểm --</option>';
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = group;
        locationGroupSelect.appendChild(option);
    });
    
    locationGroupSelect.disabled = false;
}

// Thiết lập các cổng lắng nghe tương tác thay đổi giá trị của người dùng
function setupEventListeners() {
    // Xử lý logic lọc phân tầng: Nhóm Địa Điểm -> Địa Điểm Cụ Thể
    locationGroupSelect.addEventListener('change', (e) => {
        const selectedGroup = e.target.value;
        locationSelect.innerHTML = '<option value="">-- Chọn địa điểm cụ thể --</option>';
        priorityTierInput.value = '';
        
        if (!selectedGroup) {
            locationSelect.disabled = true;
            calculatePay();
            return;
        }

        // Lọc danh sách các địa điểm thuộc nhóm đã chọn
        const filtered = locationsData.filter(item => item.LocationGroup === selectedGroup);
        filtered.forEach(item => {
            const option = document.createElement('option');
            option.value = item.Location;
            option.textContent = item.Location;
            option.dataset.priority = item.Priority; // Đính kèm siêu dữ liệu Priority vào thẻ lựa chọn
            locationSelect.appendChild(option);
        });

        locationSelect.disabled = false;
        calculatePay();
    });

    // Cập nhật mức độ ưu tiên Priority tự động khi chọn xong Địa Điểm Cụ Thể
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

    // Lắng nghe sự thay đổi số lượng đầu vào để tự động tính toán lại tức thì
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
        // Phương án 1: Chỉ tính tiền thuê địa điểm cố định = Giá Địa Điểm * Số Ngày
        totalPay = pricingTier.pricePerLoc * days;
    } else if (selectedCase === '2') {
        // Phương án 2: Tính dựa trên khối lượng nhân sự = Giá Mỗi Nhân Sự * Số Nhân Sự * Số Ngày
        const workers = parseInt(workersInput.value) || 0;
        totalPay = pricingTier.pricePerPerson * workers * days;
    }

    // Định dạng tiền tệ động theo chuẩn Việt Nam Đồng (VND - vi-VN)
    totalPayDisplay.textContent = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(totalPay);
}