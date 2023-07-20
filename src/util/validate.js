export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}
export function validatePhone(phone) {
    const phonePattern = /^\d{10,}$/; // Định dạng 10 số trở lên
    return phonePattern.test(phone)
}
export function getLevel(id_team, id_level) {
    let team;
    let level;
    if (id_team === 1) {
        team = 'Ban điều hành'
    } else if (id_team === 2) {
        team = 'Nhân sự'
    } else if (id_team === 3) {
        team = 'Back End'
    } else if (id_team === 4) {
        team = 'Front End'
    } else if (id_team === 5) {
        team = 'Devops'
    } else if (id_team === 6) {
        team = 'Tester'
    } else if (id_team === 7) {
        team = 'PA'
    } else if (id_team === 8) {
        team = 'QC'
    }
    if (id_level === 1) {
        level = 'Trưởng nhóm'
    } else if (id_level === 2) {
        level = 'Nhân viên'
    }
    return { team, level }
}