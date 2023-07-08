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

console.log(hoisting())
function hoisting() {
    let a = 100
    console.log(a++)
}
console.log(ketqua)


const numbers = [1, 2, 3, 4, 5];

// Sử dụng map()
const doubledNumbers = numbers.map((num) => num * 2);
console.log(doubledNumbers); // Output: [2, 4, 6, 8, 10]

// Sử dụng forEach()
numbers.forEach((num, index) => {
    numbers[1] = 1000;
});
console.log(numbers); // Output: [2, 4, 6, 8, 10]

[
    {
        nameSong : 'making my ware',
        nameAuth : 'Sơn Tùng MTP',
        description : 'Ra mắt sản phẩm mới nhất của Son tùng mtp trong năm 2023 này.',
        imgURL : 'img.png',
        linkMusic : 'music.mp3'
    },
    {
        nameSong : 'making my ware 2',
        nameAuth : 'Sơn Tùng MTP 2',
        description : 'Ra mắt sản phẩm mới nhất của Son tùng mtp trong năm 2023 này.',
        imgURL : 'img.png',
        linkMusic : 'music.mp3'
    }
]