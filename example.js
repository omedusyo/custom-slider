
// TODO: Delete the following
const slider = Slider({
  min: 0, max: 0 + 120*1, N: 120,
  defaultPosition: 20,
  selector: '.slider-container',
});

slider.subscribe((v, k, p) => {
  console.log(`val=${v}, pos=${k}, %=${p}`);
});

