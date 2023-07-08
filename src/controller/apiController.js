import pool from "../config/connectPool";
import jwt from "jsonwebtoken"
import { generateAccessToken, generateRefreshToken } from "../util";
import dotenv from 'dotenv'
const bcrypt = require("bcrypt")
dotenv.config()
const secretKeyRe = process.env.SECRET_REFECT_TOKEN;

let register = async (req, res) => {
    const { fullname, username, password, id_team, id_level } = req.body;
    // Thêm ngày tạo tài khoản vào cơ sở dữ liệu
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (password.length > 22 || password.length < 6) {
        return res.status(500).json({ error: 'Mật khẩu tối đa 22 kí tự và tối thiểu 10 kí tự' })
    }
    if (typeof id_team !== 'number' || typeof id_level !== 'number') {
        return res.status(500).json({ error: 'Vui lòng nhập đúng kiểu dữ liệu' })
    }
    // let team;
    // let level;
    // if(name_team === 1) {
    //     team = 'Ban điều hành'
    // } else if(name_team === 2) {
    //     team = 'Nhân sự'
    // } else if(name_team === 3) {
    //     team = 'Back End'
    // } else if(name_team === 4) {
    //     team = 'Front End'
    // } else if(name_team === 5) {
    //     team = 'Devops'
    // } else if(name_team === 6) {
    //     team = 'Tester'
    // } else if(name_team === 7) {
    //     team = 'PA'
    // } else if(name_team === 8) {
    //     team = 'QC'
    // }
    // if(name_level === 1){
    //     level= 'Trưởng nhóm'
    // } else if(name_level === 2) {
    //     level = 'Nhân viên'
    // }

    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Lỗi kết nối đến MySQL:', err);
        }
        // Truy vấn SQL để kiểm tra xem tên đăng nhập đã tồn tại chưa
        const checkQuery = 'SELECT * FROM users WHERE username = ?';
        connection.query(checkQuery, [username], async (error, results) => {
            if (error) {
                console.error('Lỗi khi truy vấn người dùng:', error);
            } else {
                if (results.length > 0) {
                    res.status(409).json({ error: 'Tên đăng nhập đã tồn tại' });
                } else {
                    const salt = await bcrypt.genSalt(10)
                    const hashedPassword = await bcrypt.hash(password, salt);
                    // Thực hiện truy vấn SQL để thêm người dùng mới
                    const insertQuery = 'INSERT INTO users (fullname,username, password,create_at, id_team, id_level) VALUES (?, ?, ?, ?, ?)';
                    connection.query(insertQuery, [fullname, username, hashedPassword, currentDate, id_team, id_level], (error, results) => {
                        // Giải phóng kết nối
                        connection.release();

                        if (error) {
                            console.error('Lỗi khi đăng kí người dùng:', error);
                            res.status(500).json({ error: 'Lỗi khi đăng kí người dùng' });
                        } else {
                            res.status(200).json({ message: 'Đăng kí thành công' });
                        }
                    });
                }
            }
        });
    });
}

let login = async (req, res) => {
    // Mở kết nối từ Pool
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Lỗi kết nối đến MySQL:', err);
        }
        // Truy vấn SQL để lấy thông tin người dùng theo username
        const query = 'SELECT * FROM users WHERE username = ?';
        connection.query(query, [req.body.username], async (error, results) => {
            if (error) {
                console.error('Lỗi khi truy vấn người dùng:', error);
            } else {
                if (results.length === 0) {
                    return res.status(401).json({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
                }
                if (results[0].status === 0) {
                    return res.status(500).json({ error: 'Tài khoản đã bị khóa' })
                }
                const validPassword = await bcrypt.compare(
                    req.body.password,
                    results[0].password
                )
                if (!validPassword) {
                    return res.status(404).json({ error: 'Sai mật khẩu' })
                }
                if (results[0] && validPassword) {
                    // Tạo accessToken và refreshToken
                    const accessToken = generateAccessToken(results[0]);
                    const refreshToken = generateRefreshToken(results[0]);
                    // lưu refreshToken vào cookie
                    // res.cookie('refreshToken', refreshToken, {
                    //     httpOnly:true,
                    //     secure:false,
                    //     path:"/",
                    //     sameSite:"strict"
                    // })
                    // Trả về data chứa accessToken và refreshToken
                    const { password, ...orther } = results[0]
                    res.status(200).json({
                        message: 'Đăng nhập thành công',
                        data: { ...orther },
                        token: { accessToken, refreshToken }
                    });
                }
            }

            // Giải phóng kết nối
            connection.release();
        });
    });
}

let refreshToken = async (req, res) => {
    const refreshToken = req.body.refreshToken;
    console.log(req.body.refreshToken)
    if (!refreshToken) return res.status(401).json({ error: "You're not authentication" })
    // xác thực refreshToke
    jwt.verify(refreshToken, secretKeyRe, (err, data) => {
        if (err) { console.log(err) }
        // create accessToken and refreshToken
        const newAccessToken = generateAccessToken(data);
        const newRefeshToken = generateRefreshToken(data);
        // lưu refreshToken vào cookie
        // res.cookie('refreshToken', newRefeshToken, {
        //     httpOnly:true,
        //     secure:false,
        //     path:"/",
        //     sameSite:"strict"
        // })
        res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefeshToken })
    })
}

let getAllUser = async (req, res) => {
    pool.query(`SELECT * FROM users`, (error, results) => {
        const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
        const itemsPerPage = 10; // Số bản ghi hiển thị trên mỗi trang
        console.log('vào data', results)
        if (error) {
            console.log(error)
            return res.status(500).json({ error: error })
        }
        let data = []
        results.forEach(e => {
            const { password, ...orther } = e
            data.push({ ...orther })
        })
        // Tính toán tổng số trang
        const totalPages = Math.ceil(data.length / itemsPerPage);

        // Lấy dữ liệu của trang hiện tại
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentPageData = data.slice(startIndex, endIndex);
        // Tạo thông tin phân trang
        const paginationInfo = {
            currentPage: page,
            totalPages: totalPages,
            itemsPerPage: itemsPerPage
        };

        res.json({ data: currentPageData, pagination: paginationInfo });
    })
}
let user = async (req, res) => {
    const userId = req.params.id;
    pool.query(`SELECT * FROM users WHERE id = ${userId}`, (error, results) => {
        if (error) {
            console.error('Error retrieving user information:', error);
        } else {
            if (results.length > 0) {
                const { password, ...orther } = results[0];
                res.json({ ...orther });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    })
}


let checkIn = async (req, res) => {
    const { id, time } = req.body;
    const checkinDate = new Date().toISOString().slice(0, 10); // Lấy ngày hiện tại
    console.log('vào body', time)
    // Lấy thời gian hiện tại
    const currentTime = new Date();

    // Đặt thời gian check-in mặc định là 08:00
    const defaultCheckInTime = new Date();
    defaultCheckInTime.setHours(8, 0, 0, 0);

    // Tính số phút trễ
    const minutesLate = Math.floor((currentTime - defaultCheckInTime) / (1000 * 60));
    // Kiểm tra xem người dùng đã check-in trong ngày đó chưa
    const checkDuplicateQuery = `SELECT * FROM checkins WHERE user_id = ${id} AND checkin_date = '${checkinDate}'`;
    pool.query(checkDuplicateQuery, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            if (results.length > 0) {
                // Người dùng đã thực hiện check-in trong ngày đó
                res.status(400).json({ error: 'Bạn đã thực hiện check in' });
            } else {
                // Thực hiện truy vấn để lưu thông tin check-in vào cơ sở dữ liệu
                const query = `INSERT INTO checkins (user_id, checkin_date, checkin_time, time_late) VALUES (${id}, '${checkinDate}', '${time}', '${minutesLate}')`;

                pool.query(query, (error, results) => {
                    console.log('vào result', results)
                    if (error) {
                        console.error('Error executing query:', error);
                        res.status(500).json({ error: 'An error occurred' });
                    } else {
                        res.json({ message: 'Check-in successful' });
                    }
                });
            }
        }
    })

}

let checkOut = async (req, res) => {
    const { id, time } = req.body;
    const checkinDate = new Date().toISOString().slice(0, 10); // Lấy ngày hiện tại
    // Lấy thời gian hiện tại
    const currentTime = new Date();

    // Đặt thời gian check-out mặc định là 17:00
    const defaultCheckOutTime = new Date();
    defaultCheckOutTime.setHours(17, 0, 0, 0);

    // Tính số phút sớm hơn
    const minutesEarly = Math.floor((defaultCheckOutTime - currentTime) / (1000 * 60));
    // Kiểm tra xem người dùng đã check-in trong ngày đó chưa
    const checkDuplicateQuery = `SELECT * FROM checkins WHERE user_id = ${id} AND checkin_date = '${checkinDate}'`;

    pool.query(checkDuplicateQuery, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            if (results.length === 0) {
                // Người dùng chưa thực hiện check-in trong ngày đó
                res.status(400).json({ error: 'Bạn chưa check in' });
            } else if (results[0].checkout_time) {
                // Người dùng đã thực hiện check-out trong ngày đó
                res.status(400).json({ error: 'Bạn đã thực hiện check out' });
            } else {
                // Thực hiện truy vấn để cập nhật thông tin check-out vào cơ sở dữ liệu
                const query = `UPDATE checkins SET checkout_time = '${time}', time_out = '${minutesEarly}' WHERE user_id = ${id} AND checkin_date = '${checkinDate}'`;

                pool.query(query, (error, results) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        res.status(500).json({ error: 'An error occurred' });
                    } else {
                        res.json({ message: 'Check-out successful' });
                    }
                });
            }
        }
    })


}

let getCheckinsUser = async (req, res) => {
    const userId = req.params.userId;
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
  
    // Xác định ngày bắt đầu và ngày kết thúc của tháng
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Thực hiện truy vấn để lấy danh sách check-ins của người dùng trong tháng
    const query = `SELECT * FROM checkins WHERE user_id = ${userId} AND checkin_date >= '${startDate.toISOString().slice(0, 10)}' AND checkin_date <= '${endDate.toISOString().slice(0, 10)}'`;
  
    pool.query(query, (error, results) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'An error occurred' });
      } else {
        res.json({ checkins: results });
      }
    });
  }
let getUserByTeam = async (req, res) => {
    const { id } = req.body
    const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
    const itemsPerPage = 10; // Số bản ghi hiển thị trên mỗi trang
    if (typeof id !== 'number') {
        return res.status(500).json({ error: 'Vui lòng nhập đúng kiểu dữ liệu' })
    }
    const query = `SELECT * FROM users WHERE id_team = ${id}`
    pool.query(query, (error, results) => {
        console.log('vào data', results)

        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            let data = []
            results.forEach(e => {
                const { password, ...orther } = e
                data.push({ ...orther })
            })
            // Tính toán tổng số trang
            const totalPages = Math.ceil(data.length / itemsPerPage);

            // Lấy dữ liệu của trang hiện tại
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const currentPageData = data.slice(startIndex, endIndex);
            // Tạo thông tin phân trang
            const paginationInfo = {
                currentPage: page,
                totalPages: totalPages,
                itemsPerPage: itemsPerPage
            };
            // Trả về kết quả phân trang và thông tin điều hướng
            res.json({ data: currentPageData, pagination: paginationInfo });
        }
    })
}


module.exports = {
    register,
    login,
    refreshToken,
    getAllUser,
    user,
    checkIn,
    checkOut,
    getUserByTeam,
    getCheckinsUser,
}