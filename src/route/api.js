import express from 'express'
import dotenv from 'dotenv'
import { getAllUser, register, refreshToken, updatePassword, login, user, checkIn, checkOut, getUserByTeam, getCheckinsUser, getRangerCheckins } from '../controller/apiController'
import multer from 'multer'
import path from 'path'
import middlewareController from '../controller/middlewareController'
import pool from '../config/connectPool'


dotenv.config()
var appRoot = require('app-root-path')
let router = express.Router()


// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, appRoot + '/src/public/images/')
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//         cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
//     }
// })
// Thiết lập storage engine cho Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, appRoot + '/src/public/images/');
    },
    filename: (req, file, cb) => {
        console.log(req.params.userId)
        const userId = req.params.userId;
        const fileName = `${userId}_${Date.now()}_${file.originalname}`;
        cb(null, fileName);
    }
});

const imageFilter = function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
let upload = multer({ storage: storage, fileFilter: imageFilter })
// const upload = multer({ dest: appRoot + '/src/public/images/' })
const initApiRouter = (app) => {
    router.post('/register', register)
    router.post('/login', login),
    router.post('/refreshToken', refreshToken),
    router.put('/users/:userId/password', updatePassword)
    router.get('/get-all-user', getAllUser)
    router.get('/user/:id', middlewareController.verifyTokenUserAndAdmin, user)
    router.post('/checkin', checkIn)
    router.post('/checkout', checkOut)
    router.get('/get-user-by-team', getUserByTeam)
    router.get('/checkins/:userId/:year/:month', getCheckinsUser)
    router.get('/users/leasttime/:year/:month', getRangerCheckins)
    router.post('/users/:userId/avatar', upload.single('avatar'), (req, res) => {
        const userId = req.params.userId;
        const avatarPath = req.file?.path;
        console.log('vào đâyyyyy', userId, req.file)

        // Thực hiện logic lưu đường dẫn avatar vào cơ sở dữ liệu (ví dụ: bảng users)
        // Lưu ý: Bạn cần thay thế phần này với logic lưu trữ tương ứng với cơ sở dữ liệu của bạn

        // Ví dụ:
        const query = `UPDATE users SET avatar = '${avatarPath}' WHERE id = ${userId}`;
        pool.query(query, (error, results) => {
            if (error) {
                console.error('Error executing query:', error);
                res.status(500).json({ error: 'An error occurred' });
                return;
            } else {
                res.json({ message: 'Avatar uploaded successfully' });
            }
        });

        // Ví dụ: Lưu đường dẫn avatar vào trường avatar trong bảng users
        const user = {
            id: userId,
            avatar: avatarPath
        };

        // Lưu trữ thông tin đường dẫn avatar vào cơ sở dữ liệu (ví dụ: bảng users)
        // Lưu ý: Bạn cần thay thế phần này với logic lưu trữ tương ứng với cơ sở dữ liệu của bạn
        // Ví dụ:
        // user.save((err) => {
        //   if (err) {
        //     console.error('Error saving user:', err);
        //     res.status(500).json({ error: 'An error occurred' });
        //   } else {
        //     res.json({ message: 'Avatar uploaded successfully' });
        //   }
        // });

        // Ví dụ: In thông báo thành công nếu lưu thành công
        res.json({ message: 'Avatar uploaded successfully' });
    })
    return app.use('/api/v1/', router)
}



export default initApiRouter