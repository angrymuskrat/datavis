let makeChbValue = (label, img) => ({ label: label, img: img });

let chbValues = [];
chbValues[true] = makeChbValue('Happy', 'src/happy.jpg');
chbValues[false] = makeChbValue('Sad', 'src/sad.jpg');

let chb = document.getElementById('chb');
let chbLabel = document.getElementById('chb-label');
let chbImg = document.getElementById('chb-img');

function updateChb() {
    let value = chbValues[chb.checked];
    chbLabel.innerHTML = value.label;
    chbImg.src = value.img;
}

updateChb();