import express from 'express'
import dotenv from 'dotenv'
import { getAllUser, register,refreshToken, login, user,checkIn,checkOut,getUserByTeam,getCheckinsUser} from '../controller/apiController'
import multer from 'multer'
import path from 'path'
import middlewareController from '../controller/middlewareController'


dotenv.config()
var appRoot = require('app-root-path')
let router = express.Router()


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, appRoot + '/src/public/images/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const imageFilter = function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
let upload = multer({ storage: storage, fileFilter: imageFilter })
const initApiRouter = (app) => {
    router.post('/register', register)
    router.post('/login', login),
    router.post('/refreshToken', refreshToken),
    router.get('/get-all-user', getAllUser)
    router.get('/user/:id',middlewareController.verifyTokenUserAndAdmin, user)
    router.post('/checkin', checkIn)
    router.post('/checkout', checkOut)
    router.get('/get-user-by-team', getUserByTeam)
    router.get('/checkins/:userId/:year/:month',getCheckinsUser)
    router.put('/upload/:userId', upload.single('avatar'), (req, res) => {
        // const userId = req.params.userId;
        // const avatarPath = req.file?.path;
        console.log(req.fileValidationError)
        // Thực hiện logic lưu đường dẫn avatar vào cơ sở dữ liệu
        // const query = `UPDATE users SET avatar = '${avatarPath}' WHERE id = ${userId}`;

        // pool.query(query, (error, results) => {
        //     if (error) {
        //         console.error('Error executing query:', error);
        //         res.status(500).json({ error: 'An error occurred' });
        //     } else {
        //         res.json({ message: 'Avatar updated successfully' });
        //     }
        // });
    })
    return app.use('/api/v1/', router)
}



export default initApiRouter