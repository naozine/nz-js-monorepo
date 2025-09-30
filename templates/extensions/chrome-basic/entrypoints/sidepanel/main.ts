const valueEl = document.querySelector<HTMLSpanElement>('#value')!;
let value = 0;

function render() {
    valueEl.textContent = String(value);
}

document.querySelector<HTMLButtonElement>('#inc')!.onclick = () => {
    value++;
    render();
};
document.querySelector<HTMLButtonElement>('#dec')!.onclick = () => {
    value--;
    render();
};

render();
