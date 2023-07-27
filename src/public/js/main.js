import { name } from "ejs";

const mang = [35, 2, 4, 6, 8, 24, 45, 7]

function sapxep(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                const temp = arr[j]
                arr[j] = arr[j + 1]
                arr[j + 1] = temp
            }
        }
    }

    return arr
}

const ketqua = sapxep(mang)