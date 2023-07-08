import jwt from "jsonwebtoken"
import dotenv from 'dotenv'

dotenv.config()
const secretKeyAcc = process.env.SECRET_ACCSEC_TOKEN;
const secretKeyRe = process.env.SECRET_REFECT_TOKEN;

export const hasPermission = (user, requiredPermission) => {
    // Kiểm tra xem người dùng có tồn tại không
    if (!user) {
        return false;
    }

    // Kiểm tra xem người dùng có thuộc quyền hạn cần thiết hay không
    if (user.permissions.includes(requiredPermission)) {
        return true;
    }

    // Người dùng không có quyền hạn cần thiết
    return false;
}

export const isValidToken = (token, secretKey) => {
    try {
        // Giải mã token
        const decoded = jwt.verify(token, secretKey);

        // Kiểm tra tính hợp lệ của token
        if (decoded.exp < Date.now() / 1000) {
            // Token đã hết hạn
            return false;
        }

        // Token hợp lệ
        return true;
    } catch (error) {
        // Lỗi khi giải mã hoặc token không hợp lệ
        return false;
    }
}


// Hàm tạo accessToken
export function generateAccessToken(user) {
    const payload = {
        id: user.id,
        admin: user.admin
    };

    const accessToken = jwt.sign(payload, secretKeyAcc, { expiresIn: "10d" });
    return accessToken;
}

// Hàm tạo refreshToken
export function generateRefreshToken(user) {
    const payload = {
        id: user.id,
        admin: user.admin
    };
    const refreshToken = jwt.sign(payload, secretKeyRe, { expiresIn : '365d' });
    return refreshToken;
}