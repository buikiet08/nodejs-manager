import express from 'express'
import configViewEngine from './config/viewEngine'
import connection from './config/connectDB';
import dotenv from 'dotenv'
import cors from 'cors'
import initApiRouter from './route/api';
const fileUpload = require('express-fileupload');
dotenv.config()

// default options
require('dotenv').config();
var morgan = require('morgan')
const app = express()
const port = process.env.PORT || 3001

// cấu hình cho req
app.use(cors());
app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use(fileUpload());
app.use(morgan('combined'))

// Middleware xử lý lỗi xác thực
app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ message: 'Unauthorized' });
  }
});
configViewEngine(app)

initApiRouter(app)
// connection


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})