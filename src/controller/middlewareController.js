import jwt from "jsonwebtoken"
import dotenv from 'dotenv'
dotenv.config()
const secretKeyAcc = process.env.SECRET_ACCSEC_TOKEN;
const middlewareController = {
    verifyToken: (req, res, next) => {
        const token = req.headers.authorization;
        if (token) {
            const accessToken = token.split(" ")[1]
            jwt.verify(accessToken, secretKeyAcc, (err, data) => {
                if (err) {
                    res.status(403).json({ error: err.message });
                    return;
                }
                if (data) {
                    const userData = data;
                    // Gán dữ liệu người dùng vào req để sử dụng trong các hàm xử lý tiếp theo
                    req.userData = userData;
                    // req.body = data
                    next()
                }
            })
        } else {
            res.status(404).json({ error: 'error' });
            return;
        }
    },
    verifyTokenUserAndAdmin: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (req.userData.id == req.params.id || req.userData.admin === 1) {
                next()
            } else {
                res.status(403).json({ error: 'Bạn không phải là người này' })
            }
        })
    }
}

module.exports = middlewareController;