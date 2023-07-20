import moment from "moment/moment";

export const getDate = () => {
    // Lấy ngày hiện tại
    const ngayHienTai = new Date();

    // Lấy ngày đầu tháng
    const ngayDauThang = new Date(ngayHienTai.getFullYear(), ngayHienTai.getMonth(), 1);
    const ngayDauThangFormat = ngayDauThang.getDate().toString().padStart(2, '0');
    const thangDauThangFormat = (ngayDauThang.getMonth() + 1).toString().padStart(2, '0');
    const namDauThangFormat = ngayDauThang.getFullYear().toString();
    const ngayDauThangFormatted = ngayDauThangFormat + '-' + thangDauThangFormat + '-' + namDauThangFormat;

    // Lấy ngày cuối tháng
    const ngayCuoiThang = new Date(ngayHienTai.getFullYear(), ngayHienTai.getMonth() + 1, 0);
    const ngayCuoiThangFormat = ngayCuoiThang.getDate().toString().padStart(2, '0');
    const thangCuoiThangFormat = (ngayCuoiThang.getMonth() + 1).toString().padStart(2, '0');
    const namCuoiThangFormat = ngayCuoiThang.getFullYear().toString();
    const ngayCuoiThangFormatted = ngayCuoiThangFormat + '-' + thangCuoiThangFormat + '-' + namCuoiThangFormat;

    // In ngày đầu tháng và ngày cuối tháng
    return {
        firstDayInMonth:moment(ngayDauThangFormatted).format('YYYY-MM-DD'),
        lastDayInMonth:moment(ngayCuoiThangFormatted, 'DD-MM-YYYY').format('YYYY-MM-DD')
    }
}