import express from 'express'
import dotenv from 'dotenv'
import cron from 'node-cron'
import {
    getAllUser,
    register,
    refreshToken,
    updatePassword,
    updateInfo,
    login,
    user,
    usersByCount,
    getUsersNew,
    checkIn,
    checkOut,
    getUserByTeam,
    getCheckinsUser,
    checkinsDayUser,
    getRangerCheckins,
    checkinUserByMonth,
    reportTeam,
    uploadAvatar,
    checkAndDeleteCheckin
} from '../controller/apiController'
import multer from 'multer'
import path from 'path'
import middlewareController from '../controller/middlewareController'

dotenv.config()
var appRoot = require('app-root-path')
let router = express.Router()

cron.schedule('0 0 * * *', () => {
    checkAndDeleteCheckin();
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        console.log(req)
        cb(null, appRoot + "/src/public/images/");
    },
    // destination:'./src/public/images/',
    // By default, multer removes file extensions so let's add them back
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
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
let upload = multer({ storage: storage, fileFilter: imageFilter });
// const upload = multer({ dest: appRoot + '/src/public/images/' })
const initApiRouter = (app) => {
    router.post('/register', register)
    router.post('/login', login)
    router.post('/refreshToken', refreshToken)
    router.put('/users/:userId/password', middlewareController.verifyToken, updatePassword)
    router.post('/user/update/:id', middlewareController.verifyToken, updateInfo)
    router.get('/get-all-user', middlewareController.verifyToken, getAllUser)
    router.get('/user/:id', middlewareController.verifyTokenUserAndAdmin, user)
    router.get('/info-user/:id', middlewareController.verifyToken, user)
    router.get('/users/count-by-team', middlewareController.verifyToken, usersByCount)
    router.get('/users/recently-created', middlewareController.verifyToken, getUsersNew)
    router.post('/checkin', middlewareController.verifyToken, checkIn)
    router.post('/checkout', middlewareController.verifyToken, checkOut)
    router.get('/get-user-by-team', middlewareController.verifyToken, getUserByTeam)
    router.get('/checkins-in-month/:userId', middlewareController.verifyToken, getCheckinsUser)
    router.get('/checkins/:userId', middlewareController.verifyToken, checkinsDayUser)
    router.get('/users/ranger-user-checkins', middlewareController.verifyToken, getRangerCheckins)
    router.get('/users/:id/:month/:year', middlewareController.verifyToken, checkinUserByMonth)
    router.get('/report-teams', middlewareController.verifyToken, reportTeam)
    router.put('/users/:userId/avatar', upload.single('avatar'), uploadAvatar)
    router.delete('user/:userId/delete-checkins',middlewareController.verifyToken, checkAndDeleteCheckin)
    return app.use('/api/v1/', router)
}


export default initApiRouter