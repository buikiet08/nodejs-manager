import express from 'express'
import configViewEngine from './config/viewEngine'
import dotenv from 'dotenv'
import cors from 'cors'
import path from 'path'
import bodyParser from 'body-parser';
import initApiRouter from './route/api';
dotenv.config()

// default options
require('dotenv').config();
var morgan = require('morgan')
const app = express()
const port = process.env.PORT || 3001

// cấu hình cho req
app.use(express.static(path.join(__dirname, 'src', 'public')));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.urlencoded({extended:true}))
app.use(express.json())
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