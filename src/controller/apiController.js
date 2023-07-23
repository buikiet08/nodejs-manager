import pool from "../config/connectPool";
import jwt from "jsonwebtoken"
import { generateAccessToken, generateRefreshToken } from "../util";
import dotenv from 'dotenv'
import { getLevel, validateEmail, validatePhone } from "../util/validate";
import { getDate } from "../util/getDate";
import { getTimeCreate } from "../util/getTimeCreate";
const bcrypt = require("bcrypt")
const moment = require('moment');
dotenv.config()
const secretKeyRe = process.env.SECRET_REFECT_TOKEN;
// đăng ký
let register = async (req, res) => {
    const { fullname, username, password, id_team, id_level } = req.body;
    // Thêm ngày tạo tài khoản vào cơ sở dữ liệu
    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss')
    if (password?.length > 22 || password?.length < 6) {
        return res.status(500).json({ error: 'Mật khẩu tối đa 22 kí tự và tối thiểu 10 kí tự' })
    }
    if (!validateEmail(username)) {
        return res.status(500).json({ error: 'Vui lòng nhập đúng định dạng email' })
    }
    if (typeof id_team !== 'number' || typeof id_level !== 'number') {
        return res.status(500).json({ error: 'Vui lòng nhập đúng kiểu dữ liệu' })
    }

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
                    // Kiểm tra xem đã có người dùng có id_level = 1 thuộc cùng id_team hay chưa
                    const checkQuery = 'SELECT * FROM users WHERE id_team = ? AND id_level = 1 LIMIT 1';
                    pool.query(checkQuery, [id_team], async (checkError, checkResults) => {
                        if (checkError) {
                            console.error('Error checking for duplicate user with id_level = 1:', checkError);
                            res.status(500).json({ error: 'An error occurred' });
                        } else {
                            // Nếu đã có người dùng có id_level = 1 thuộc cùng id_team
                            if (checkResults.length > 0) {
                                if (id_level === 1) {
                                    res.status(409).json({ error: 'Đã có nhóm trưởng, nếu bạn muốn thay đổi hay chuyển cấp bậc của nhóm trưởng hiện tại' });
                                } else {
                                    const salt = await bcrypt.genSalt(10)
                                    const hashedPassword = await bcrypt.hash(password, salt);
                                    // Thực hiện truy vấn SQL để thêm người dùng mới
                                    const insertQuery = 'INSERT INTO users (fullname,username, password,create_at, id_team, id_level) VALUES (?, ?, ?, ?, ?,?)';
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
                            else {
                                const salt = await bcrypt.genSalt(10)
                                const hashedPassword = await bcrypt.hash(password, salt);
                                // Thực hiện truy vấn SQL để thêm người dùng mới
                                const insertQuery = 'INSERT INTO users (fullname,username, password,create_at, id_team, id_level) VALUES (?, ?, ?, ?, ?,?)';
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
                    })

                }
            }
        });
    });
}
// đăng nhập
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
                    const currentDate = moment().format('YYYY-MM-DD HH:mm:ss')
                    pool.query('UPDATE users SET update_at = ? WHERE id = ?', [currentDate, results[0].id], (error, data) => {
                        if (error) {
                            return res.status(500).json({ error: error })
                        }
                        const { password, update_at, create_at, ...orther } = results[0]
                        const loginTime = moment(update_at).format('DD-MM-YYYY HH:mm:ss')
                        const currentDate = moment(create_at).format('DD-MM-YYYY')

                        res.status(200).json({
                            message: 'Đăng nhập thành công',
                            data: { ...orther, create_at: currentDate, update_at: loginTime },
                            token: { accessToken, refreshToken }
                        });
                    })
                    // lưu refreshToken vào cookie
                    // res.cookie('refreshToken', refreshToken, {
                    //     httpOnly:true,
                    //     secure:false,
                    //     path:"/",
                    //     sameSite:"strict"
                    // })
                    // Trả về data chứa accessToken và refreshToken
                }
            }

            // Giải phóng kết nối
            connection.release();
        });
    });
}
//refreshtoken
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
// thay đổi mật khẩu
let updatePassword = async (req, res) => {
    const userId = req.params.userId;
    const { oldPassword, newPassword } = req.body;

    // Truy vấn người dùng trong cơ sở dữ liệu
    const getUserQuery = 'SELECT * FROM users WHERE id = ?';
    pool.query(getUserQuery, [userId], (error, results) => {
        if (error) {
            console.error('Error querying user:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
        } else {
            const user = results[0];

            // Kiểm tra mật khẩu cũ của người dùng
            bcrypt.compare(oldPassword, user.password, (error, result) => {
                if (error) {
                    console.error('Error comparing passwords:', error);
                    res.status(500).json({ error: 'An error occurred' });
                } else if (!result) {
                    res.status(401).json({ error: 'Invalid old password' });
                } else {
                    // Mã hóa mật khẩu mới
                    bcrypt.hash(newPassword, 10, (error, hash) => {
                        if (error) {
                            console.error('Error hashing password:', error);
                            res.status(500).json({ error: 'An error occurred' });
                        } else {
                            // Cập nhật mật khẩu mới trong cơ sở dữ liệu
                            const updateUserQuery = 'UPDATE users SET password = ? WHERE id = ?';
                            pool.query(updateUserQuery, [hash, userId], (error, results) => {
                                if (error) {
                                    console.error('Error updating password:', error);
                                    res.status(500).json({ error: 'An error occurred' });
                                } else {
                                    res.json({ message: 'Password changed successfully' });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}
// cập nhật thông tin
let updateInfo = async (req, res) => {
    const { id } = req.params
    const { phone, address, date } = req.body
    if (!validatePhone(phone)) {
        return res.status(500).json({ error: 'Số điện thoại không đúng định dạng' })
    }
    const query = 'UPDATE users SET phone = ?, address = ?, date = ? WHERE id = ?'
    pool.query(query, [phone, address, date, id], (error, result) => {
        if (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            res.json({ message: 'Cập nhật thông tin thành công' });
        }
    })
}
// lấy dánh sách user
let getAllUser = async (req, res) => {
    const { type, value, id_team } = req.query;
    let query = 'SELECT * FROM users WHERE 1=1 ';
    let params = [];
    if (type === 'search') {
        query += ` AND (fullname LIKE ? OR phone LIKE ?)`;
        params.push(`%${value}%`);
        params.push(`%${value}%`);
    }

    if (id_team) {
        query += ' AND id_team = ?';
        params.push(id_team);
    }
    query += `
    ORDER BY 
        CASE 
        WHEN id_team = 1 THEN 1
        WHEN id_level = 1 THEN 2
        ELSE 3
        END
    `;
    pool.query(query, params, (error, results) => {
        const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
        const itemsPerPage = 10; // Số bản ghi hiển thị trên mỗi trang
        if (error) {
            console.log(error)
            return res.status(500).json({ error: error })
        }
        let data = []
        results.forEach(e => {
            if (e.admin === 0) {
                const { password, create_at, update_at, ...orther } = e

                const { team, level } = getLevel(e.id_team, e.id_level)
                const createDate = moment(create_at).format('DD-MM-YYYY')
                const loginTime = moment(update_at).format('DD-MM-YYYY HH:mm:ss')
                const timeSinceCreation = getTimeCreate(create_at)
                data.push({ ...orther, create_at: createDate, update_at: loginTime, title_name: team, title_level: level, create_date: timeSinceCreation })
            }
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
// lấy thông tin user
let user = async (req, res) => {
    const userId = req.params.id;
    pool.query(`SELECT * FROM users WHERE id = ${userId}`, (error, results) => {
        if (error) {
            console.error('Error retrieving user information:', error);
        } else {
            if (results.length > 0) {
                const { team, level } = getLevel(results[0].id_team, results[0].id_level)
                const { password, create_at, update_at, date, ...orther } = results[0];
                const createDate = moment(create_at).format('DD-MM-YYYY')
                const loginTime = moment(update_at).format('DD-MM-YYYY HH:mm:ss')
                const timeSinceCreation = getTimeCreate(create_at)
                res.json({ data: { ...orther, date: moment(date).format('DD-MM-YYYY'), update_at: loginTime, title_name: team, title_level: level, create_at: createDate, create_date: timeSinceCreation } });
            } else {
                res.status(404).json({ error: 'User not found' });
            }
        }
    })
}
// 
let usersByCount = async (req, res) => {
    const query = 'SELECT id_team, COUNT(*) as user_count FROM users GROUP BY id_team';

    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error fetching user count by team:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            res.json({ data: results });
        }
    });
}
// lấy danh sách user mới từ ngày 5 so với ngày hiện tại
let getUsersNew = async (req, res) => {
    const today = new Date();
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const query = `
      SELECT *
      FROM users
      WHERE create_at >= ? AND create_at <= ? ORDER BY create_at DESC
    `;

    pool.query(query, [fiveDaysAgo, today], (error, results) => {
        if (error) {
            console.error('Error fetching recently created users:', error)
            res.status(500).json({ error: 'An error occurred' });
        } else {
            let dataUsers = []
            results.forEach(e => {
                if (e.admin === 0) {
                    const { password, create_at, ...orther } = e
                    const { team, level } = getLevel(e.id_team, e.id_level)
                    const timeSinceCreation = getTimeCreate(create_at)
                    const createDate = moment(create_at).format('DD-MM-YYYY')
                    dataUsers.push({ ...orther, create_at: createDate, title_name: team, title_level: level, create_date: timeSinceCreation })
                }
            })
            res.json({ data: dataUsers });
        }
    });
}
// checkin
let checkIn = async (req, res) => {
    const { id, time } = req.body;
    const timeCheckin = time.split(' ')[1]
    const dayCheckin = time.split(' ')[0]
    // set h mặt dịnh là 8h
    const defaultTime = moment('08:00:00', 'HH:mm:ss');
    const timeOut = moment('17:00:00', 'HH:mm:ss')
    const checkInTime = moment(String(timeCheckin), 'HH:mm:ss')
    const lateDuration = moment.duration(checkInTime.diff(defaultTime));
    let hoursLate = lateDuration.hours();
    let minutesLate = lateDuration.minutes();
    if (hoursLate < 0) hoursLate = 0
    if (minutesLate < 0) minutesLate = 0
    const formattedLateTime = `${String(hoursLate).padStart(2, '0')}:${String(minutesLate).padStart(2, '0')}`;
    const currentDate = moment().format('YYYY-MM-DD')
    // Kiểm tra xem người dùng đã check-in trong ngày đó chưa
    const checkDuplicateQuery = `SELECT * FROM checkins WHERE user_id = ${id} AND checkin_date = '${currentDate}'`;
    pool.query(checkDuplicateQuery, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ error: 'An error occurred' });
        } else {
            if (results.length > 0) {
                // Người dùng đã thực hiện check-in trong ngày đó
                return res.status(404).json({ error: 'Bạn đã thực hiện check in' });
            }
            else if (moment(String(timeCheckin), 'HH:mm:ss').isSameOrAfter(timeOut)) {
                return res.status(404).json({ error: 'Đã quá giờ check in, đã hết giờ làm việc' });
            }
            else {
                // Thực hiện truy vấn để lưu thông tin check-in vào cơ sở dữ liệu
                const query = `INSERT INTO checkins (user_id, checkin_date, checkin_time, time_late) VALUES (${id}, '${currentDate}', '${time}', '${formattedLateTime}')`;

                pool.query(query, (error, results) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        return res.status(500).json({ error: 'An error occurred' });
                    } else {
                        res.json({ message: 'Check-in thành công', data: { user_id: id, ckeckin_date: dayCheckin, checkin_time: time, time_late: formattedLateTime } });
                    }
                });
            }
        }
    })

}
// checkout
let checkOut = async (req, res) => {
    const { id, time } = req.body;
    const timeCheckout = time.split(' ')[1]
    const dayCheckout = time.split(' ')[0]

    // set h mặt dịnh là 17h
    const defaultTime = moment('17:00:00', 'HH:mm:ss');
    const checkInTime = moment(String(timeCheckout), 'HH:mm:ss')
    const lateDuration = moment.duration(defaultTime.diff(checkInTime));
    let hoursLate = lateDuration.hours();
    let minutesLate = lateDuration.minutes();
    if (hoursLate < 0) hoursLate = 0
    if (minutesLate < 0) minutesLate = 0
    const currentDate = moment().format('YYYY-MM-DD')
    const formattedLateTime = `${String(hoursLate).padStart(2, '0')}:${String(minutesLate).padStart(2, '0')}`;
    // Kiểm tra xem người dùng đã check-in trong ngày đó chưa
    const checkDuplicateQuery = `SELECT * FROM checkins WHERE user_id = ${id} AND checkin_date = '${currentDate}'`;

    pool.query(checkDuplicateQuery, (error, results) => {
        console.log()
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
                const query = `UPDATE checkins SET checkout_time = '${time}', time_out = '${formattedLateTime}' WHERE user_id = ${id} AND checkin_date = '${currentDate}'`;

                // thực hiện thêm checkout
                pool.query(query, (error, results) => {
                    if (error) {
                        console.error('Error executing query:', error);
                        res.status(500).json({ error: 'An error occurred' });
                    } else {
                        res.json({ message: 'Check-out thành công', data: { user_id: id, checkin_date: dayCheckout, checkout_time: time, time_out: formattedLateTime } });
                    }
                });

            }
        }
    })


}
// lấy tt checkins trong tháng
let getCheckinsUser = async (req, res) => {
    const userId = req.params.userId;
    const { firstDayInMonth, lastDayInMonth } = getDate()
    // Thực hiện truy vấn để lấy danh sách check-ins của người dùng trong tháng
    const query = `SELECT * FROM checkins WHERE user_id = ? AND checkin_date >= ? AND checkin_date <= ?`;
    const value = [userId, firstDayInMonth, lastDayInMonth]
    // console.log(userId,startDate.toISOString().slice(0, 10),endDate.toISOString().slice(0, 10))
    pool.query(query, value, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            let data = [];
            results.forEach(i => data.push({ ...i, checkin_date: moment(i.checkin_date).format('DD-MM-YYYY') }))
            res.json({ data: data });
        }
    });
}
// lấy checkins trong ngày
let checkinsDayUser = async (req, res) => {
    const userId = req.params.userId;
    const currentDateTime = moment().format('YYYY-MM-DD');
    const query = `SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?`
    pool.query(query, [userId, currentDateTime], (error, results) => {
        console.log(results)
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            res.json({ data: results });
        }
    });
}
// lấy user theo team
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
// lấy top user chuyên cần tốt
let getRangerCheckins = async (req, res) => {
    const query = `
    SELECT
      u.*,
      COUNT(c.id) AS checkin_count,
      MAX(c.checkin_time) AS latest_checkin_time,
      MIN(c.checkout_time) AS earliest_checkout_time
    FROM users u
    LEFT JOIN checkins c ON u.id = c.user_id
    WHERE c.checkin_date >= DATE_FORMAT(NOW(), '%Y-%m-01') AND c.checkin_date < DATE_FORMAT(NOW() + INTERVAL 1 MONTH, '%Y-%m-01')
    GROUP BY u.id
    ORDER BY checkin_count DESC, (c.time_late - c.time_out) ASC
    LIMIT 10;
    `;

    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            let data = []
            results.forEach(e => {
                if (e.admin === 0) {
                    const { password, create_at, update_at, ...orther } = e

                    const { team, level } = getLevel(e.id_team, e.id_level)
                    const createDate = moment(create_at).format('DD-MM-YYYY')
                    const loginTime = moment(update_at).format('DD-MM-YYYY HH:mm:ss')
                    const timeSinceCreation = getTimeCreate(create_at)
                    data.push({ ...orther, create_at: createDate, update_at: loginTime, title_name: team, title_level: level, create_date: timeSinceCreation })
                }
            })
            res.json({ data: data });
        }
    });
}
// lấy dách sách checkin của user trong tháng
let checkinUserByMonth = async (req, res) => {
    const { id, month, year } = req.params;

    // Kiểm tra xem tháng được truyền vào có hợp lệ hay không (tháng từ 1-12)
    if (!month || isNaN(month) || month < 1 || month > 12) {
        res.status(400).json({ error: 'Invalid month' });
        return;
    }
    // Xác định ngày đầu tiên và ngày cuối cùng trong tháng
    const firstDayOfMonth = moment(`${year}-${month}-01`).startOf('month').format('YYYY-MM-DD');
    const lastDayOfMonth = moment(`${year}-${month}-01`).endOf('month').format('YYYY-MM-DD');
    // const startOfMonth = moment().year(moment().year()).month(month - 1).date(1).startOf('day');
    // const endOfMonth = startOfMonth.clone().endOf('month');
    // Truy vấn danh sách check-ins của user trong tháng
    // console.log(firstDayOfMonth.format('DD-MM-YYYY'),lastDayOfMonth.format('DD-MM-YYYY'))
    pool.query(
        'SELECT * FROM checkins WHERE user_id = ? AND checkin_date BETWEEN ? AND ?',
        [id, firstDayOfMonth, lastDayOfMonth],
        (err, results) => {
            if (err) {
                res.status(500).json({ error: 'Internal server error' });
                return;
            }
            let data = [];
            results.forEach(i => data.push({ ...i, checkin_date: moment(i.checkin_date).format('DD-MM-YYYY') }))
            res.status(200).json({ data: data });
        }
    );
};
// thống kê team
let reportTeam = async (req, res) => {
    const query = 'SELECT * FROM users WHERE admin = 0'
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
        } else {
            const personal = results.length
            // lay id_team
            const groupedTeams = [...new Set(results.filter((item) => item.id_team !== 0).map((item) => item.id_team))];
            // lay new user
            const currentDate = new Date();
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(currentDate.getDate() - 5);

            const newUser = results.filter((user) => {
                const userCreatedAt = new Date(user.create_at);
                return userCreatedAt >= fiveDaysAgo && userCreatedAt <= currentDate;
            });
            res.json({
                data: [
                    { title: 'Nhân sự', count: personal },
                    { title: 'Bộ phận', count: groupedTeams?.length },
                    { title: 'Nhân sự mới', count: newUser?.length }
                ]
            });
        }
    })
}
// upload avatar
let uploadAvatar = async (req, res) => {
    const userId = req.params.userId;
    const avatarPath = req.file?.filename;
    console.log('vào ảnh', req.file)
    if (req.fileValidationError) {
        return res.send(req.fileValidationError);
    }
    else if (!req.file) {
        return res.status(500).json({ error: 'Vui lòng chọn ảnh' });
    }
    const query = `UPDATE users SET avatar = '${avatarPath}' WHERE id = ${userId}`;
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            res.status(500).json({ error: 'An error occurred' });
            return;
        } else {
            res.json({ message: 'Avatar uploaded successfully', avatar: req.file.filename });
        }
    });

}
// xoa ket qua checkin khi khong checkout
const checkAndDeleteCheckin = (req, res) => {
    const id = req.id
    const queryGet = `SELECT user_id FROM checkins WHERE checkout_time IS NULL`;
    pool.query(queryGet, (error, results) => {
        if (error) {
            console.error('Error executing query:', error);
            return res.status(500).json({ error: 'An error occurred' });
        }

        if (results.length === 0) {
            // Nếu không tìm thấy kết quả, trả về thông báo cho người dùng
            return res.json({ success: false, message: 'Không có kết quả checkin cần xóa' });
        }
        const query = `DELETE FROM checkins WHERE user_id = ? AND checkout_time IS NULL`;
        pool.query(query, [id], (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'An error occurred' });
            }

            return res.json({
                message: 'Kết quả checkin của bạn đã bị xóa vì chưa checkout trước 00:00',
                success: true,
            });
        });
    })
};









module.exports = {
    register,
    login,
    refreshToken,
    updatePassword,
    updateInfo,
    getAllUser,
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
}
