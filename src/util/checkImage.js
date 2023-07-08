const axios = require('axios');

async function checkImageLink(imageUrl) {
    try {
        const response = await axios.head(imageUrl);
        if (response.status === 200) {
            console.log('Liên kết hình ảnh hợp lệ.');
            return true
        } else {
            results = false
            console.log('Liên kết hình ảnh không hợp lệ.');
            return false
        }
    } catch (error) {
        results = false
        console.log('Lỗi kiểm tra liên kết hình ảnh:', error.message);
        return false
    }
}

export default checkImageLink
