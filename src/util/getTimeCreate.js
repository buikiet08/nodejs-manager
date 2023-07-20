const moment = require('moment');

export const getTimeCreate = (create_at) => {
    const createdDate = moment(create_at);
    const currentDate = moment();

    // Tính số giờ, phút và ngày giữa hai ngày
    const hoursDiff = currentDate.diff(createdDate, 'hours');
    const minutesDiff = currentDate.diff(createdDate, 'minutes');
    const daysDiff = currentDate.diff(createdDate, 'days');

    let timeSinceCreation;

    if (daysDiff >= 1) {
        timeSinceCreation = `${daysDiff} ngày`;
    } else if (hoursDiff >= 1) {
        timeSinceCreation = `${hoursDiff} giờ`;
    } else {
        timeSinceCreation = `${minutesDiff} phút`;
    }
    return timeSinceCreation
}